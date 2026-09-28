'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getDb } from './db';
import { saveInquiry, toggleFavorite } from './queries';
import { checkPassword, currentUser, endSession, hashPassword, startSession } from './auth';
import { slugify } from './format';
import type { User } from './types';
import { getPlan, planLabel } from './plans';
import { safeNextPath } from './next-path';
import {
  LISTING_EXPIRY_SQL, cancelSubscription, quotaFor, renewListing, resumeSubscription, subscribe,
} from './subscriptions';

export interface FormState {
  ok: boolean;
  message: string;
  errors?: Record<string, string>;
}

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/* ---------------------------------------------------------------- inquiries */

const inquirySchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name'),
  email: z.string().trim().email('Enter a valid email address'),
  phone: z.string().trim().optional(),
  message: z.string().trim().min(10, 'Please include a short message'),
});

export async function submitInquiry(_prev: FormState, data: FormData): Promise<FormState> {
  const parsed = inquirySchema.safeParse({
    name: data.get('name'),
    email: data.get('email'),
    phone: data.get('phone') ?? undefined,
    message: data.get('message'),
  });

  if (!parsed.success) {
    return { ok: false, message: 'Please correct the fields below.', errors: fieldErrors(parsed.error) };
  }

  const rawId = data.get('listing_id');
  const listingId = rawId ? Number(rawId) : null;

  saveInquiry({
    listingId: Number.isInteger(listingId) ? listingId : null,
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone,
    message: parsed.data.message,
    kind: String(data.get('kind') ?? 'listing'),
  });

  return { ok: true, message: 'Thanks — your message has been sent. We will be in touch shortly.' };
}

/* ------------------------------------------------------------------- auth */


const registerSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(8, 'Use at least 8 characters'),
  company: z.string().trim().optional(),
  phone: z.string().trim().optional(),
});

export async function register(_prev: FormState, data: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    name: data.get('name'),
    email: data.get('email'),
    password: data.get('password'),
    // The signup form no longer asks for these; an absent field arrives as
    // null, which .optional() rejects, so treat it as not provided.
    company: data.get('company') ?? undefined,
    phone: data.get('phone') ?? undefined,
  });

  if (!parsed.success) {
    return { ok: false, message: 'Please correct the fields below.', errors: fieldErrors(parsed.error) };
  }

  const db = getDb();
  const exists = db.prepare('SELECT 1 FROM users WHERE email = ?').get(parsed.data.email);
  if (exists) {
    return { ok: false, message: 'An account with that email already exists.', errors: { email: 'Already registered' } };
  }

  const hash = await hashPassword(parsed.data.password);
  const result = db
    .prepare('INSERT INTO users (email, password_hash, name, company, phone) VALUES (?, ?, ?, ?, ?)')
    .run(
      parsed.data.email,
      hash,
      parsed.data.name,
      parsed.data.company || null,
      parsed.data.phone || null,
    );

  await startSession(Number(result.lastInsertRowid));
  redirect(safeNextPath(data.get('next')) ?? '/account');
}

export async function login(_prev: FormState, data: FormData): Promise<FormState> {
  const email = String(data.get('email') ?? '').trim().toLowerCase();
  const password = String(data.get('password') ?? '');

  if (!email || !password) {
    return { ok: false, message: 'Enter your email and password.' };
  }

  const user = getDb().prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;

  // Same message either way so the form does not reveal which emails exist.
  if (!user || !(await checkPassword(password, user.password_hash))) {
    return { ok: false, message: 'Email or password is incorrect.' };
  }

  await startSession(user.id);
  redirect(safeNextPath(data.get('next')) ?? '/account');
}

export async function logout(): Promise<void> {
  await endSession();
  redirect('/');
}

/* ---------------------------------------------------------------- listings */

const listingSchema = z.object({
  title: z.string().trim().min(6, 'Give the listing a descriptive title'),
  body_style: z.string().trim().min(2, 'Choose a vehicle type'),
  make: z.string().trim().min(1, 'Enter the make'),
  model: z.string().trim().min(1, 'Enter the model'),
  year: z.coerce.number().int().min(1900, 'Enter a valid year').max(new Date().getFullYear() + 2),
  price: z.coerce.number().int().min(1, 'Enter an asking price'),
  mileage: z.coerce.number().int().min(0, 'Enter the mileage'),
  passengers: z.coerce.number().int().min(1, 'Enter passenger capacity'),
  city: z.string().trim().min(2, 'Enter the city'),
  state: z.string().trim().min(2, 'Enter the state').max(2, 'Use the two-letter state code'),
  condition: z.string().trim().default('Used'),
  fuel: z.string().trim().default('Gasoline'),
  exterior_color: z.string().trim().default('Black'),
  interior_color: z.string().trim().default('Black'),
  description: z.string().trim().min(20, 'Add at least a short description'),
  features: z.string().trim().optional(),
  seller_name: z.string().trim().min(2, 'Enter a contact name'),
  seller_phone: z.string().trim().min(7, 'Enter a contact phone number'),
});

const IMAGE_KEY: Record<string, string> = {
  'Stretch Limousine': 'stretch-limousine',
  'SUV Stretch': 'suv-stretch',
  Sedan: 'sedan',
  SUV: 'suv',
  'Shuttle Bus': 'shuttle-bus',
  Motorcoach: 'motorcoach',
  'Sprinter Van': 'sprinter-van',
  'Party Bus': 'party-bus',
  'CEO Mobile Office': 'ceo-mobile-office',
  Antique: 'antique',
};

export async function createListing(_prev: FormState, data: FormData): Promise<FormState> {
  const parsed = listingSchema.safeParse(Object.fromEntries(data.entries()));

  if (!parsed.success) {
    return { ok: false, message: 'Please correct the fields below.', errors: fieldErrors(parsed.error) };
  }

  const user = await currentUser();
  if (!user) {
    return { ok: false, message: 'Create an account and choose a plan to list a vehicle.' };
  }

  // Admins list house inventory: no plan needed and no expiry.
  const isAdmin = user.role === 'admin';
  if (!isAdmin) {
    const quota = quotaFor(user.id);
    if (quota.reason === 'no-plan') {
      return { ok: false, message: 'Choose a subscription plan before listing a vehicle.' };
    }
    if (quota.reason === 'full') {
      return {
        ok: false,
        message: `Your ${planLabel(quota.subscription!.plan)} plan allows ${quota.limit} active listing${quota.limit === 1 ? '' : 's'} and all are in use. Upgrade, or remove or let a listing expire.`,
      };
    }
  }

  const v = parsed.data;
  const db = getDb();

  // Slugs must stay unique; append a counter when the natural slug is taken.
  const base = slugify(`${v.year}-${v.make}-${v.model}-${v.body_style}`);
  let slug = base;
  let n = 2;
  while (db.prepare('SELECT 1 FROM listings WHERE slug = ?').get(slug)) {
    slug = `${base}-${n}`;
    n += 1;
  }

  const key = IMAGE_KEY[v.body_style] ?? 'sedan';
  const images = [1, 2, 3, 4].map((i) => `/img/${key}-${i}.svg`);
  const features = (v.features ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  db.prepare(
    `INSERT INTO listings (
       slug, title, body_style, make, model, year, price, mileage, passengers,
       condition, fuel, exterior_color, interior_color, city, state,
       description, features, images, seller_id, seller_name, seller_phone, status, expires_at
     ) VALUES (
       @slug, @title, @body_style, @make, @model, @year, @price, @mileage, @passengers,
       @condition, @fuel, @exterior_color, @interior_color, @city, @state,
       @description, @features, @images, @seller_id, @seller_name, @seller_phone, 'published',
       ${isAdmin ? 'NULL' : LISTING_EXPIRY_SQL}
     )`,
  ).run({
    ...v,
    state: v.state.toUpperCase(),
    slug,
    features: JSON.stringify(features),
    images: JSON.stringify(images),
    seller_id: user.id,
  });

  revalidatePath('/inventory');
  revalidatePath('/account');
  revalidatePath('/');
  redirect(`/listing/${slug}`);
}

export async function deleteListing(data: FormData): Promise<void> {
  const user = await currentUser();
  if (!user) redirect('/login');

  const id = Number(data.get('id'));
  if (!Number.isInteger(id)) return;

  // Scoped to the owner so one seller cannot delete another's listing.
  getDb().prepare('DELETE FROM listings WHERE id = ? AND seller_id = ?').run(id, user.id);

  revalidatePath('/account');
  revalidatePath('/inventory');
}

export async function favorite(data: FormData): Promise<void> {
  const user = await currentUser();
  if (!user) redirect('/login');

  const id = Number(data.get('listing_id'));
  if (!Number.isInteger(id)) return;

  toggleFavorite(user.id, id);
  revalidatePath('/account');
}


/* ----------------------------------------------------------- subscriptions */

export async function subscribeToPlan(data: FormData): Promise<void> {
  const plan = getPlan(String(data.get('plan') ?? ''));
  if (!plan) redirect('/subscriptions');

  const user = await currentUser();
  if (!user) {
    redirect(`/register?next=${encodeURIComponent(`/subscriptions/checkout?plan=${plan.id}`)}`);
  }

  subscribe(user.id, plan.id);
  revalidatePath('/account');
  revalidatePath('/subscriptions');
  redirect(`/account?subscribed=${plan.id}`);
}

export async function cancelPlan(): Promise<void> {
  const user = await currentUser();
  if (!user) redirect('/login');
  cancelSubscription(user.id);
  revalidatePath('/account');
  revalidatePath('/subscriptions');
}

export async function resumePlan(): Promise<void> {
  const user = await currentUser();
  if (!user) redirect('/login');
  resumeSubscription(user.id);
  revalidatePath('/account');
  revalidatePath('/subscriptions');
}

export async function renewMyListing(data: FormData): Promise<void> {
  const user = await currentUser();
  if (!user) redirect('/login');

  const id = Number(data.get('id'));
  if (!Number.isInteger(id)) return;

  const result = renewListing(user.id, id);
  revalidatePath('/account');
  revalidatePath('/inventory');
  if (!result.ok) redirect(`/account?renew=${result.reason}`);
}

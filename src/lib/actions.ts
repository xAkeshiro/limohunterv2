'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getDb } from './db';
import { saveInquiry, toggleFavorite } from './queries';
import { SessionConfigError, checkPassword, currentUser, endSession, hashPassword, startSession } from './auth';
import { slugify } from './format';
import type { User } from './types';
import { getPlan, planLabel } from './plans';
import { safeNextPath } from './next-path';
import { MAX_PHOTOS, isOwnImage } from './storage';
import { parseListing, type ImageCredit, type Listing } from './types';
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

  await saveInquiry({
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

  const db = await getDb();
  const hash = await hashPassword(parsed.data.password);

  // The unique index settles races between two signups for one email.
  const created = await db.get<{ id: number }>(
    `INSERT INTO users (email, password_hash, name, company, phone) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (email) DO NOTHING RETURNING id`,
    [parsed.data.email, hash, parsed.data.name, parsed.data.company || null, parsed.data.phone || null],
  );
  if (!created) {
    return { ok: false, message: 'An account with that email already exists.', errors: { email: 'Already registered' } };
  }

  const failure = await trySession(created.id);
  if (failure) return failure;
  redirect(safeNextPath(data.get('next')) ?? '/account');
}

/** Starts a session, turning a missing SESSION_SECRET into a form message. */
async function trySession(userId: number): Promise<FormState | null> {
  try {
    await startSession(userId);
    return null;
  } catch (err) {
    if (err instanceof SessionConfigError) return { ok: false, message: err.message };
    throw err;
  }
}

export async function login(_prev: FormState, data: FormData): Promise<FormState> {
  const email = String(data.get('email') ?? '').trim().toLowerCase();
  const password = String(data.get('password') ?? '');

  if (!email || !password) {
    return { ok: false, message: 'Enter your email and password.' };
  }

  const db = await getDb();
  const user = await db.get<User>('SELECT * FROM users WHERE email = ?', [email]);

  // Same message either way so the form does not reveal which emails exist.
  if (!user || !(await checkPassword(password, user.password_hash))) {
    return { ok: false, message: 'Email or password is incorrect.' };
  }

  const failure = await trySession(user.id);
  if (failure) return failure;
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
    const quota = await quotaFor(user.id);
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
  const db = await getDb();
  const slug = await uniqueSlug(slugify(`${v.year}-${v.make}-${v.model}-${v.body_style}`));

  const uploaded = collectImages(data);
  if (uploaded.length === 0 && !isAdmin) {
    return { ok: false, message: 'Add at least one photo of the vehicle.', errors: { images: 'At least one photo is required.' } };
  }
  // Admins may publish house inventory without photos; drawings stand in.
  const key = IMAGE_KEY[v.body_style] ?? 'sedan';
  const images = uploaded.length > 0 ? uploaded : [1, 2, 3, 4].map((i) => `/img/${key}-${i}.svg`);
  const features = (v.features ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  await db.run(
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
    {
    ...v,
    state: v.state.toUpperCase(),
    slug,
    features: JSON.stringify(features),
    images: JSON.stringify(images),
    seller_id: user.id,
    },
  );

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
  const db = await getDb();
  await db.run('DELETE FROM listings WHERE id = ? AND seller_id = ?', [id, user.id]);

  revalidatePath('/account');
  revalidatePath('/inventory');
}

export async function favorite(data: FormData): Promise<void> {
  const user = await currentUser();
  if (!user) redirect('/login');

  const id = Number(data.get('listing_id'));
  if (!Number.isInteger(id)) return;

  await toggleFavorite(user.id, id);
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

  await subscribe(user.id, plan.id);
  revalidatePath('/account');
  revalidatePath('/subscriptions');
  redirect(`/account?subscribed=${plan.id}`);
}

export async function cancelPlan(): Promise<void> {
  const user = await currentUser();
  if (!user) redirect('/login');
  await cancelSubscription(user.id);
  revalidatePath('/account');
  revalidatePath('/subscriptions');
}

export async function resumePlan(): Promise<void> {
  const user = await currentUser();
  if (!user) redirect('/login');
  await resumeSubscription(user.id);
  revalidatePath('/account');
  revalidatePath('/subscriptions');
}

export async function renewMyListing(data: FormData): Promise<void> {
  const user = await currentUser();
  if (!user) redirect('/login');

  const id = Number(data.get('id'));
  if (!Number.isInteger(id)) return;

  const result = await renewListing(user.id, id);
  revalidatePath('/account');
  revalidatePath('/inventory');
  if (!result.ok) redirect(`/account?renew=${result.reason}`);
}

/** Natural slug, with a numeric suffix when it is already taken. */
async function uniqueSlug(base: string): Promise<string> {
  const db = await getDb();
  const taken = new Set(
    (await db.all<{ slug: string }>("SELECT slug FROM listings WHERE slug = ? OR slug LIKE ?", [base, `${base}-%`])).map(
      (r) => r.slug,
    ),
  );
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}

/* ------------------------------------------------------------------ photos */

/**
 * Photo links submitted with a listing form, in display order. Only links to
 * our own storage survive (plus any the listing already had), so a crafted
 * form cannot attach images hosted elsewhere.
 */
function collectImages(data: FormData, alreadyOnListing: string[] = []): string[] {
  const kept = new Set(alreadyOnListing);
  const images = data
    .getAll('keep_image')
    .map((v) => String(v).trim())
    .filter((src) => src && (isOwnImage(src) || kept.has(src)));
  return [...new Set(images)].slice(0, MAX_PHOTOS);
}

/** A seller editing their own listing: details, photos and sold status. */
export async function updateMyListing(_prev: FormState, data: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!user) return { ok: false, message: 'Sign in to edit your listing.' };

  const id = Number(data.get('id'));
  const db = await getDb();
  const row = Number.isInteger(id)
    ? await db.get<Listing>('SELECT * FROM listings WHERE id = ? AND seller_id = ?', [id, user.id])
    : undefined;
  // Same answer for "missing" and "not yours", so ids cannot be probed.
  if (!row) return { ok: false, message: 'That listing could not be found in your account.' };
  const existing = parseListing(row);

  const parsed = listingSchema.safeParse(Object.fromEntries(data.entries()));
  if (!parsed.success) {
    return { ok: false, message: 'Please correct the fields below.', errors: fieldErrors(parsed.error) };
  }

  const images = collectImages(data, existing.images);
  if (images.length === 0) {
    return { ok: false, message: 'Keep at least one photo of the vehicle.', errors: { images: 'At least one photo is required.' } };
  }
  const credits: ImageCredit[] = existing.image_credits.filter((c) => images.includes(c.src));

  const v = parsed.data;
  await db.run(
    `UPDATE listings SET
       title=@title, body_style=@body_style, make=@make, model=@model, year=@year,
       price=@price, mileage=@mileage, passengers=@passengers, condition=@condition,
       fuel=@fuel, exterior_color=@exterior_color, interior_color=@interior_color,
       city=@city, state=@state, description=@description, features=@features,
       seller_name=@seller_name, seller_phone=@seller_phone,
       images=@images, image_credits=@image_credits, sold=@sold
     WHERE id=@id AND seller_id=@seller_id`,
    {
      ...v,
      id,
      seller_id: user.id,
      state: v.state.toUpperCase(),
      features: JSON.stringify((v.features ?? '').split('\n').map((l) => l.trim()).filter(Boolean)),
      images: JSON.stringify(images),
      image_credits: JSON.stringify(credits),
      sold: data.get('sold') ? 1 : 0,
    },
  );

  revalidatePath('/account');
  revalidatePath('/inventory');
  revalidatePath(`/listing/${existing.slug}`);
  return { ok: true, message: 'Listing saved.' };
}

/* --------------------------------------------------------------- settings */

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name').max(80, 'Keep it under 80 characters'),
  company: z.string().trim().max(120, 'Keep it under 120 characters').optional(),
  phone: z.string().trim().max(40, 'Keep it under 40 characters').optional(),
});

export async function updateProfile(_prev: FormState, data: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!user) return { ok: false, message: 'Please sign in again.' };

  const parsed = profileSchema.safeParse({
    name: data.get('name'),
    company: data.get('company') ?? undefined,
    phone: data.get('phone') ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, message: 'Please correct the fields below.', errors: fieldErrors(parsed.error) };
  }

  const db = await getDb();
  await db.run('UPDATE users SET name = ?, company = ?, phone = ? WHERE id = ?', [
    parsed.data.name,
    parsed.data.company || null,
    parsed.data.phone || null,
    user.id,
  ]);
  // The header shows the name on every page.
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Profile saved.' };
}

/** Both sensitive changes need the current password, so an unattended session cannot take the account. */
async function confirmPassword(userId: number, password: string): Promise<boolean> {
  const db = await getDb();
  const row = await db.get<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = ?', [userId]);
  return Boolean(row) && (await checkPassword(password, row!.password_hash));
}

export async function changeEmail(_prev: FormState, data: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!user) return { ok: false, message: 'Please sign in again.' };

  const email = z.string().trim().toLowerCase().email().safeParse(data.get('email'));
  if (!email.success) return { ok: false, message: 'Enter a valid email address.', errors: { email: 'Enter a valid email address' } };
  if (email.data === user.email) return { ok: false, message: 'That is already your email address.' };

  if (!(await confirmPassword(user.id, String(data.get('current_password') ?? '')))) {
    return { ok: false, message: 'Your current password is incorrect.', errors: { current_password: 'Incorrect password' } };
  }

  const db = await getDb();
  try {
    await db.run('UPDATE users SET email = ? WHERE id = ?', [email.data, user.id]);
  } catch (err) {
    if ((err as { code?: string }).code === '23505') {
      return { ok: false, message: 'That email is already used by another account.', errors: { email: 'Already in use' } };
    }
    throw err;
  }
  revalidatePath('/account/settings');
  return { ok: true, message: `Email changed to ${email.data}. Use it next time you sign in.` };
}

export async function changePassword(_prev: FormState, data: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!user) return { ok: false, message: 'Please sign in again.' };

  const next = String(data.get('new_password') ?? '');
  if (next.length < 8) return { ok: false, message: 'Use at least 8 characters.', errors: { new_password: 'At least 8 characters' } };
  if (next !== String(data.get('confirm_password') ?? '')) {
    return { ok: false, message: 'The new passwords do not match.', errors: { confirm_password: 'Does not match' } };
  }
  if (!(await confirmPassword(user.id, String(data.get('current_password') ?? '')))) {
    return { ok: false, message: 'Your current password is incorrect.', errors: { current_password: 'Incorrect password' } };
  }

  const db = await getDb();
  await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [await hashPassword(next), user.id]);
  return { ok: true, message: 'Password changed.' };
}

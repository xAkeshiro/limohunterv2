'use server';

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getDb } from './db';
import { requireAdmin } from './admin';
import { slugify } from './format';
import type { FormState } from './actions';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml']);
const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
};
const MAX_BYTES = 8 * 1024 * 1024;

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/**
 * Persists uploaded photos and returns their public paths. Names are random so
 * a caller cannot overwrite an existing file by re-using a filename.
 */
async function storeUploads(files: File[]): Promise<{ paths: string[]; skipped: number }> {
  const paths: string[] = [];
  let skipped = 0;

  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  for (const file of files) {
    if (!file || file.size === 0) continue;
    if (!ALLOWED.has(file.type) || file.size > MAX_BYTES) {
      skipped += 1;
      continue;
    }
    const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${EXT[file.type]}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(UPLOAD_DIR, name), buffer);
    paths.push(`/uploads/${name}`);
  }

  return { paths, skipped };
}

const editSchema = z.object({
  title: z.string().trim().min(6, 'Give the listing a descriptive title'),
  body_style: z.string().trim().min(2, 'Choose a vehicle type'),
  make: z.string().trim().min(1, 'Enter the make'),
  model: z.string().trim().min(1, 'Enter the model'),
  year: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 2),
  price: z.coerce.number().int().min(1, 'Enter an asking price'),
  mileage: z.coerce.number().int().min(0),
  passengers: z.coerce.number().int().min(1),
  condition: z.string().trim().min(1),
  fuel: z.string().trim().min(1),
  transmission: z.string().trim().min(1),
  drivetrain: z.string().trim().min(1),
  exterior_color: z.string().trim().min(1),
  interior_color: z.string().trim().min(1),
  vin: z.string().trim().optional(),
  city: z.string().trim().min(2, 'Enter the city'),
  state: z.string().trim().min(2).max(2, 'Use the two-letter state code'),
  description: z.string().trim().min(20, 'Add at least a short description'),
  features: z.string().trim().optional(),
  seller_name: z.string().trim().min(2),
  seller_phone: z.string().trim().min(7),
  status: z.enum(['published', 'draft', 'archived']),
  featured: z.coerce.number().int().min(0).max(1),
  sold: z.coerce.number().int().min(0).max(1),
});

export async function adminUpdateListing(_prev: FormState, data: FormData): Promise<FormState> {
  await requireAdmin();

  const id = Number(data.get('id'));
  if (!Number.isInteger(id)) return { ok: false, message: 'That listing no longer exists.' };

  const raw = Object.fromEntries(data.entries());
  const parsed = editSchema.safeParse({
    ...raw,
    featured: data.get('featured') ? 1 : 0,
    sold: data.get('sold') ? 1 : 0,
  });

  if (!parsed.success) {
    return { ok: false, message: 'Please correct the fields below.', errors: fieldErrors(parsed.error) };
  }

  const db = getDb();
  const existing = db.prepare('SELECT images FROM listings WHERE id = ?').get(id) as
    | { images: string }
    | undefined;
  if (!existing) return { ok: false, message: 'That listing no longer exists.' };

  // Existing photos the editor kept, plus anything newly uploaded.
  const kept = data.getAll('keep_image').map(String).filter(Boolean);
  const uploads = data.getAll('photos').filter((v): v is File => v instanceof File);
  const { paths: added, skipped } = await storeUploads(uploads);
  const images = [...kept, ...added];

  const v = parsed.data;
  db.prepare(
    `UPDATE listings SET
       title=@title, body_style=@body_style, make=@make, model=@model, year=@year,
       price=@price, mileage=@mileage, passengers=@passengers, condition=@condition,
       fuel=@fuel, transmission=@transmission, drivetrain=@drivetrain,
       exterior_color=@exterior_color, interior_color=@interior_color, vin=@vin,
       city=@city, state=@state, description=@description, features=@features,
       images=@images, seller_name=@seller_name, seller_phone=@seller_phone,
       status=@status, featured=@featured, sold=@sold
     WHERE id=@id`,
  ).run({
    ...v,
    id,
    vin: v.vin || null,
    state: v.state.toUpperCase(),
    features: JSON.stringify(
      (v.features ?? '').split('\n').map((l) => l.trim()).filter(Boolean),
    ),
    images: JSON.stringify(images),
  });

  revalidatePath('/admin/listings');
  revalidatePath('/inventory');
  revalidatePath('/');

  const note = skipped > 0 ? ` ${skipped} file(s) were rejected (type or size).` : '';
  return { ok: true, message: `Listing saved.${note}` };
}

export async function adminDeleteListing(data: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(data.get('id'));
  if (!Number.isInteger(id)) return;

  getDb().prepare('DELETE FROM listings WHERE id = ?').run(id);

  revalidatePath('/admin/listings');
  revalidatePath('/inventory');
  revalidatePath('/');

  if (data.get('redirect')) redirect('/admin/listings');
}

/** Flips one boolean column from the listings table without a full form post. */
export async function adminToggleFlag(data: FormData): Promise<void> {
  await requireAdmin();

  const id = Number(data.get('id'));
  const field = String(data.get('field'));
  if (!Number.isInteger(id) || !['featured', 'sold'].includes(field)) return;

  getDb().prepare(`UPDATE listings SET ${field} = CASE ${field} WHEN 1 THEN 0 ELSE 1 END WHERE id = ?`).run(id);

  revalidatePath('/admin/listings');
  revalidatePath('/inventory');
  revalidatePath('/');
}

export async function adminSetStatus(data: FormData): Promise<void> {
  await requireAdmin();

  const id = Number(data.get('id'));
  const status = String(data.get('status'));
  if (!Number.isInteger(id) || !['published', 'draft', 'archived'].includes(status)) return;

  getDb().prepare('UPDATE listings SET status = ? WHERE id = ?').run(status, id);

  revalidatePath('/admin/listings');
  revalidatePath('/inventory');
  revalidatePath('/');
}

export async function adminDeleteInquiry(data: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(data.get('id'));
  if (!Number.isInteger(id)) return;

  getDb().prepare('DELETE FROM inquiries WHERE id = ?').run(id);
  revalidatePath('/admin/inquiries');
}

export async function adminSetRole(data: FormData): Promise<void> {
  const admin = await requireAdmin();

  const id = Number(data.get('id'));
  const role = String(data.get('role'));
  if (!Number.isInteger(id) || !['admin', 'member'].includes(role)) return;

  // Never let an admin strip their own access and lock everyone out.
  if (id === admin.id) return;

  getDb().prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
  revalidatePath('/admin/users');
}

const createSchema = editSchema.omit({ status: true, featured: true, sold: true });

export async function adminCreateListing(_prev: FormState, data: FormData): Promise<FormState> {
  await requireAdmin();

  const parsed = createSchema.safeParse(Object.fromEntries(data.entries()));
  if (!parsed.success) {
    return { ok: false, message: 'Please correct the fields below.', errors: fieldErrors(parsed.error) };
  }

  const v = parsed.data;
  const db = getDb();

  const base = slugify(`${v.year}-${v.make}-${v.model}-${v.body_style}`);
  let slug = base;
  let n = 2;
  while (db.prepare('SELECT 1 FROM listings WHERE slug = ?').get(slug)) {
    slug = `${base}-${n}`;
    n += 1;
  }

  const uploads = data.getAll('photos').filter((f): f is File => f instanceof File);
  const { paths } = await storeUploads(uploads);
  const images = paths.length > 0 ? paths : ['/img/placeholder.svg'];

  db.prepare(
    `INSERT INTO listings (
       slug, title, body_style, make, model, year, price, mileage, passengers,
       condition, fuel, transmission, drivetrain, exterior_color, interior_color, vin,
       city, state, description, features, images, seller_name, seller_phone, status
     ) VALUES (
       @slug, @title, @body_style, @make, @model, @year, @price, @mileage, @passengers,
       @condition, @fuel, @transmission, @drivetrain, @exterior_color, @interior_color, @vin,
       @city, @state, @description, @features, @images, @seller_name, @seller_phone, 'published'
     )`,
  ).run({
    ...v,
    slug,
    vin: v.vin || null,
    state: v.state.toUpperCase(),
    features: JSON.stringify((v.features ?? '').split('\n').map((l) => l.trim()).filter(Boolean)),
    images: JSON.stringify(images),
  });

  revalidatePath('/admin/listings');
  revalidatePath('/inventory');
  redirect('/admin/listings');
}

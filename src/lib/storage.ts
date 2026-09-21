import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]);

const EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

export const MAX_BYTES = 8 * 1024 * 1024;

/** Vercel Blob is used whenever its token is present; otherwise local disk. */
export function usingBlob(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export interface StoreResult {
  paths: string[];
  skipped: number;
  errors: string[];
}

function filename(type: string): string {
  return `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${EXTENSION[type] ?? 'jpg'}`;
}

async function storeOnBlob(file: File): Promise<string> {
  // Imported lazily so local development never needs the package loaded.
  const { put } = await import('@vercel/blob');
  const blob = await put(`vehicles/${filename(file.type)}`, file, {
    access: 'public',
    contentType: file.type,
  });
  return blob.url;
}

async function storeOnDisk(file: File): Promise<string> {
  const dir = path.join(process.cwd(), 'public', 'uploads');
  await fs.mkdir(dir, { recursive: true });

  const name = filename(file.type);
  await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${name}`;
}

/**
 * Persists uploaded photos and returns their public URLs. Rejected files are
 * counted rather than thrown, so one bad file cannot lose a whole form post.
 */
export async function storeImages(files: File[]): Promise<StoreResult> {
  const paths: string[] = [];
  const errors: string[] = [];
  let skipped = 0;

  for (const file of files) {
    if (!file || file.size === 0) continue;

    if (!ALLOWED_TYPES.has(file.type)) {
      skipped += 1;
      errors.push(`${file.name || 'file'}: unsupported type`);
      continue;
    }
    if (file.size > MAX_BYTES) {
      skipped += 1;
      errors.push(`${file.name || 'file'}: larger than 8 MB`);
      continue;
    }

    try {
      paths.push(usingBlob() ? await storeOnBlob(file) : await storeOnDisk(file));
    } catch (err) {
      skipped += 1;
      errors.push(`${file.name || 'file'}: ${(err as Error).message}`);
    }
  }

  return { paths, skipped, errors };
}

/** Accepts full URLs pasted into the admin, one per line. */
export function parseImageUrls(raw: string): string[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => /^https?:\/\//i.test(line) || line.startsWith('/'));
}

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { localUploadDir } from '@/lib/storage';

const TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
};

/** Serves photos uploaded without Vercel Blob (see localUploadDir). */
export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const type = TYPES[path.extname(name).toLowerCase()];
  if (!/^[\w-]+(\.[\w-]+)*$/.test(name) || !type) return new Response('Not found', { status: 404 });

  try {
    const body = await fs.readFile(path.join(localUploadDir(), name));
    return new Response(new Uint8Array(body), {
      headers: {
        'Content-Type': type,
        // Names are random and never reused, so the file never changes.
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}

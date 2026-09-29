import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { MAX_UPLOAD_BYTES, storeImages, uploadMode } from '@/lib/storage';

export const dynamic = 'force-dynamic';

/**
 * Development fallback when no Blob token is set: stores one photo in
 * data/uploads. Refuses to run on a deployment, where that folder would not
 * persist.
 */
export async function POST(request: Request) {
  if (uploadMode() !== 'local') {
    return NextResponse.json({ error: 'Local uploads are only available in development.' }, { status: 404 });
  }
  if (!(await currentUser())) {
    return NextResponse.json({ error: 'Sign in to upload photos.' }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file received.' }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: `${file.name} is larger than 10 MB.` }, { status: 413 });
  }

  const { paths, errors } = await storeImages([file]);
  if (paths.length === 0) {
    return NextResponse.json({ error: errors[0] ?? 'Upload failed.' }, { status: 400 });
  }
  return NextResponse.json({ url: paths[0] });
}

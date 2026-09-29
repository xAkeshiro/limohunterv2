import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { ALLOWED_TYPES, MAX_UPLOAD_BYTES, usingBlob } from '@/lib/storage';

export const dynamic = 'force-dynamic';

/**
 * Issues short-lived tokens so the browser can upload a photo straight to
 * Vercel Blob. Only signed-in users get a token, and each token accepts one
 * image of an allowed type and size under a random name.
 *
 * Vercel Blob also calls this route when an upload finishes; handleUpload
 * verifies that callback's signature itself, so it needs no session.
 */
export async function POST(request: Request) {
  if (!usingBlob()) {
    return NextResponse.json({ error: 'Photo storage is not configured.' }, { status: 503 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const user = await currentUser();
        if (!user) throw new Error('Sign in to upload photos.');
        return {
          allowedContentTypes: [...ALLOWED_TYPES],
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: user.id }),
        };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

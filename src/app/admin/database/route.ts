import fs from 'node:fs';
import { NextResponse } from 'next/server';
import { databasePath } from '@/lib/db';
import { isAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';

/**
 * Streams the live database so an admin can commit the current state back to
 * the repository while the deployment is still running from a temporary copy.
 */
export async function GET() {
  if (!(await isAdmin())) {
    return new NextResponse('Not found', { status: 404 });
  }

  const file = databasePath();
  if (!fs.existsSync(file)) {
    return new NextResponse('No database file', { status: 404 });
  }

  return new NextResponse(fs.readFileSync(file), {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': 'attachment; filename="fleet-marketplace.db"',
      'Cache-Control': 'no-store',
    },
  });
}

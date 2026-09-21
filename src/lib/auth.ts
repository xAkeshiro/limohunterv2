import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { getDb } from './db';
import type { User } from './types';

const COOKIE = 'fm_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secret(): string {
  return process.env.SESSION_SECRET ?? 'fleet-marketplace-dev-secret-change-me';
}

/** `<userId>.<expiry>.<hmac>` — signed so it cannot be forged client-side. */
function sign(payload: string): string {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function createToken(userId: number): string {
  const expires = Math.floor(Date.now() / 1000) + MAX_AGE;
  const payload = `${userId}.${expires}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token: string): number | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [rawId, rawExpiry, signature] = parts;
  const expected = sign(`${rawId}.${rawExpiry}`);

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  if (Number(rawExpiry) < Math.floor(Date.now() / 1000)) return null;

  const id = Number(rawId);
  return Number.isInteger(id) ? id : null;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function checkPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function startSession(userId: number): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, createToken(userId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  const id = verifyToken(token);
  if (id === null) return null;

  const row = getDb().prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
  return row ?? null;
}

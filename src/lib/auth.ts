import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { getDb } from './db';
import type { User } from './types';

const COOKIE = 'fm_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const DEV_SECRET = 'fleet-marketplace-dev-secret-change-me';
const MIN_SECRET_LENGTH = 16;

export class SessionConfigError extends Error {
  constructor() {
    super('Sign-in is unavailable: SESSION_SECRET is not set on the server.');
    this.name = 'SessionConfigError';
  }
}

/**
 * The key that signs session cookies. In production it must come from
 * SESSION_SECRET: the development fallback is in a public repository, so
 * accepting it would let anyone forge a session for any account, including
 * an admin. Without a real secret, sign-in is refused rather than weakened.
 */
function secret(): string | null {
  const configured = process.env.SESSION_SECRET?.trim() ?? '';
  if (configured.length >= MIN_SECRET_LENGTH) return configured;
  return process.env.NODE_ENV === 'production' ? null : DEV_SECRET;
}

export function sessionsConfigured(): boolean {
  return secret() !== null;
}

/** `<userId>.<expiry>.<hmac>` — signed so it cannot be forged client-side. */
function sign(payload: string, key: string): string {
  return crypto.createHmac('sha256', key).update(payload).digest('base64url');
}

export function createToken(userId: number): string {
  const key = secret();
  if (!key) throw new SessionConfigError();
  const expires = Math.floor(Date.now() / 1000) + MAX_AGE;
  const payload = `${userId}.${expires}`;
  return `${payload}.${sign(payload, key)}`;
}

export function verifyToken(token: string): number | null {
  const key = secret();
  if (!key) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [rawId, rawExpiry, signature] = parts;
  const expected = sign(`${rawId}.${rawExpiry}`, key);

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
  const token = createToken(userId);
  const jar = await cookies();
  jar.set(COOKIE, token, {
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

  const db = await getDb();
  return (await db.get<User>('SELECT * FROM users WHERE id = ?', [id])) ?? null;
}

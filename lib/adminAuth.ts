import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { argon2id, argon2Verify } from 'hash-wasm';

export const SESSION_COOKIE = 'dn_admin_session';
export const ADMIN_EMAIL_ENV = 'ADMIN_EMAIL';
const SESSION_TTL = 8 * 60 * 60; // 8 hours

/**
 * Admin credentials. Password is stored as an Argon2id hash (PHC string) in
 * ADMIN_PASSWORD_HASH_B64 — base64-encoded PHC string, to avoid env expansion.
 * Configure on Vercel:
 *   ADMIN_EMAIL=faizudemon@gmail.com
 *   ADMIN_PASSWORD_HASH_B64=<base64 encoded Argon2id PHC string>
 */
export function adminEmail(): string | null {
  return process.env[ADMIN_EMAIL_ENV] ?? null;
}

/** Constant-time string compare. */
function safeEq(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export function verifyEmail(email: string): boolean {
  const expected = adminEmail();
  if (!expected) return false;
  return safeEq(email.trim().toLowerCase(), expected.trim().toLowerCase());
}

const ARGON_PARAMS = { parallelism: 1, iterations: 2, memorySize: 19456, hashLength: 32 } as const;

/** Generate an Argon2id PHC string (used for setup / tooling). */
export async function hashPassword(password: string): Promise<string> {
  return argon2id({ password, salt: crypto.randomBytes(16), ...ARGON_PARAMS, outputType: 'encoded' });
}

/** Verify only Argon2id hashes; missing or invalid configuration fails closed. */
export async function verifyPassword(pw: string): Promise<boolean> {
  const encoded = process.env.ADMIN_PASSWORD_HASH_B64;
  if (!encoded) return false;
  try {
    const hash = Buffer.from(encoded, 'base64').toString('utf8');
    if (!hash.startsWith('$argon2id$')) return false;
    return await argon2Verify({ password: pw, hash });
  } catch {
    return false;
  }
}

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('SESSION_SECRET is not configured');
  return value;
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', secret()).update(payload).digest('hex');
}

export function makeSessionValue(): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL;
  return `${exp}.${sign(`dn-admin-v2|${exp}`)}`;
}

export function verifySessionValue(v: string | undefined): boolean {
  if (!v) return false;
  const idx = v.indexOf('.');
  if (idx <= 0) return false;
  const expStr = v.slice(0, idx);
  const mac = v.slice(idx + 1);
  const exp = parseInt(expStr, 10);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return false;
  try { return safeEq(mac, sign(`dn-admin-v2|${expStr}`)); } catch { return false; }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_TTL,
};

export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return verifySessionValue(store.get(SESSION_COOKIE)?.value);
}

/* Naive in-memory login throttle: 8 attempts / 10 min per IP (per server instance). */
const attempts = new Map<string, { count: number; reset: number }>();

export function rateLimit(ip: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || rec.reset < now) {
    attempts.set(ip, { count: 1, reset: now + 10 * 60 * 1000 });
    return { allowed: true, retryAfter: 0 };
  }
  rec.count += 1;
  if (rec.count > 8) {
    return { allowed: false, retryAfter: Math.ceil((rec.reset - now) / 1000) };
  }
  return { allowed: true, retryAfter: 0 };
}

export function clearRateLimit(ip: string): void {
  attempts.delete(ip);
}

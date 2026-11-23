import crypto from 'node:crypto';
import { cookies } from 'next/headers';

export const SESSION_COOKIE = 'dn_admin_session';
const SESSION_TTL = 8 * 60 * 60; // 8 hours

function secret(): string {
  return process.env.SESSION_SECRET || 'duenever-dev-secret';
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', secret()).update(payload).digest('hex');
}

/** Constant-time string compare. */
function safeEq(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export function verifyPassword(pw: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || expected.length < 8) return false;
  return safeEq(pw, expected);
}

export function makeSessionValue(): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL;
  return `${exp}.${sign(`dn-admin|${exp}`)}`;
}

export function verifySessionValue(v: string | undefined): boolean {
  if (!v) return false;
  const idx = v.indexOf('.');
  if (idx <= 0) return false;
  const expStr = v.slice(0, idx);
  const mac = v.slice(idx + 1);
  const exp = parseInt(expStr, 10);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return false;
  return safeEq(mac, sign(`dn-admin|${expStr}`));
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

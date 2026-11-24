import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, sessionCookieOptions, verifyPassword, verifyEmail, rateLimit, clearRateLimit, makeSessionValue } from '@/lib/adminAuth';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  let email = '';
  let pw = '';
  try {
    const body = (await req.json()) as { email?: unknown; password?: unknown };
    if (typeof body.email === 'string') email = body.email;
    if (typeof body.password === 'string') pw = body.password;
  } catch {
    return NextResponse.json({ error: 'invalid request' }, { status: 400 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = rateLimit(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${rl.retryAfter}s.` },
      { status: 429 },
    );
  }

  if (!pw || pw.length > 200 || email.length > 200 || !verifyEmail(email) || !(await verifyPassword(pw))) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  clearRateLimit(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, makeSessionValue(), sessionCookieOptions);
  return res;
}

import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, sessionCookieOptions, verifyPassword, rateLimit, clearRateLimit, makeSessionValue } from '@/lib/adminAuth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let pw = '';
  try {
    const body = (await req.json()) as { password?: unknown };
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

  if (!pw || pw.length > 200 || !verifyPassword(pw)) {
    return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
  }

  clearRateLimit(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, makeSessionValue(), sessionCookieOptions);
  return res;
}

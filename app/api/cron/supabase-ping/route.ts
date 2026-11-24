import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Vercel Cron calls this daily; the gateway GET performs a real database read. */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization') || '';
  const expected = secret ? `Bearer ${secret}` : '';
  if (!expected || Buffer.byteLength(auth) !== Buffer.byteLength(expected) ||
      !timingSafeEqual(Buffer.from(auth), Buffer.from(expected))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const base = process.env.SUPABASE_URL;
  if (!base) return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  try {
    const response = await fetch(`${base.replace(/\/$/, '')}/functions/v1/site-config`, {
      cache: 'no-store', signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`gateway returned ${response.status}`);
    const data = await response.json();
    if (!data || typeof data.config !== 'object') throw new Error('invalid gateway response');
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Supabase ping failed:', error);
    return NextResponse.json({ error: 'Supabase ping failed' }, { status: 502 });
  }
}

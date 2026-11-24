import { NextRequest, NextResponse } from 'next/server';
import { handleRoom } from '@/lib/rooms';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Best-effort abuse limit per instance; the unguessable room code and seat
// credential are the security boundary, not this ephemeral counter.
const requests = new Map<string, { count: number; until: number }>();
function allowAttempt(ip: string) {
  const now = Date.now();
  if (requests.size > 5000) for (const [key, value] of requests) if (value.until < now) requests.delete(key);
  const entry = requests.get(ip);
  if (!entry || entry.until < now) { requests.set(ip, { count: 1, until: now + 600_000 }); return true; }
  entry.count++; return entry.count <= 40;
}
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin) {
    try { if (new URL(origin).host !== request.headers.get('host')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); }
    catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); }
  }
  const length = Number(request.headers.get('content-length') || 0);
  if (length > 8192) return NextResponse.json({ error: 'Request too large' }, { status: 413 });
  try {
    const text = await request.text();
    if (Buffer.byteLength(text) > 8192) return NextResponse.json({ error: 'Request too large' }, { status: 413 });
    const body = JSON.parse(text);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid request');
    if ((body.op === 'create' || body.op === 'join') && !allowAttempt(request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown')) {
      return NextResponse.json({ error: 'Too many attempts; try again later' }, { status: 429 });
    }
    return NextResponse.json(await handleRoom(body), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Request failed' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
}

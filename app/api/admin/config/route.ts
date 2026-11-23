import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/adminAuth';
import { getSiteConfigFresh, saveSiteConfig, normalizeConfig } from '@/lib/site-config';

export const runtime = 'nodejs';

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const config = await getSiteConfigFresh();
  if (!config) {
    return NextResponse.json(
      { error: 'Config gateway unreachable. Check SUPABASE_URL env and the edge function.' },
      { status: 502 },
    );
  }
  return NextResponse.json({ config });
}

export async function PUT(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const config = normalizeConfig(raw);
  const result = await saveSiteConfig(config);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? 'save failed' }, { status: 502 });
  }
  // Make the change live immediately
  try {
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/', 'layout');
  } catch {
    /* revalidation best-effort */
  }
  return NextResponse.json({ ok: true });
}

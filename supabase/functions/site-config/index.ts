// Public reads; writes require the server-held admin token. The service key
// remains in Supabase's function environment and is never sent to visitors.
const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers });

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (request: Request) => {
  if (request.method !== 'GET' && request.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  const base = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!base || !key) return json({ error: 'gateway is not configured' }, 503);
  const dbHeaders = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  const endpoint = `${base}/rest/v1/site_config?id=eq.1`;
  try {
    if (request.method === 'GET') {
      const response = await fetch(`${endpoint}&select=data,updated_at`, { headers: dbHeaders });
      if (!response.ok) return json({ error: 'configuration read failed' }, 502);
      const rows = await response.json();
      if (!Array.isArray(rows) || !rows[0]) return json({ error: 'configuration missing' }, 502);
      return json({ config: rows[0].data, updatedAt: rows[0].updated_at });
    }
    const expected = Deno.env.get('ADMIN_TOKEN') || '';
    if (!expected || !safeEqual(request.headers.get('x-admin-token') || '', expected)) return json({ error: 'unauthorized' }, 401);
    let data: unknown;
    try { data = await request.json(); } catch { return json({ error: 'invalid json' }, 400); }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return json({ error: 'config must be an object' }, 400);
    const response = await fetch(endpoint, {
      method: 'PATCH',
      headers: { ...dbHeaders, Prefer: 'return=representation' },
      body: JSON.stringify({ data, updated_at: new Date().toISOString() }),
    });
    if (!response.ok) return json({ error: 'configuration save failed' }, 502);
    const rows = await response.json();
    if (!Array.isArray(rows) || rows.length !== 1) return json({ error: 'configuration missing' }, 502);
    return json({ ok: true });
  } catch {
    return json({ error: 'database unavailable' }, 502);
  }
});

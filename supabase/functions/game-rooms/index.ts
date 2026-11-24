// The web server is the only caller: validate a server-held token before
// accessing the private room table. Game rules are enforced by the web server.
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
function equal(a: string, b: string) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }
Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  const secret = Deno.env.get('ROOM_GATEWAY_TOKEN') || '';
  if (!secret || !equal(request.headers.get('x-admin-token') || '', secret)) return json({ error: 'unauthorized' }, 401);
  const base = Deno.env.get('SUPABASE_URL'), key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!base || !key) return json({ error: 'not configured' }, 503);
  try {
    const data = await request.json();
    const code = data.op === 'get' ? data.code : data.room?.code;
    if (typeof code !== 'string' || !/^[A-Za-z0-9_-]{22}$/.test(code)) return json({ error: 'invalid code' }, 400);
    const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
    const endpoint = `${base}/rest/v1/game_rooms`;
    if (data.op === 'get') {
      const r = await fetch(`${endpoint}?code=eq.${code}&select=room`, { headers });
      if (!r.ok) return json({ error: 'read failed' }, 502);
      const rows = await r.json(); return json({ room: rows[0]?.room || null });
    }
    if (data.op === 'create') {
      // Opportunistic cleanup of expired snapshots; no player data is returned.
      await fetch(`${endpoint}?expires=lt.${Date.now()}`, { method: 'DELETE', headers });
      const room = data.room;
      const r = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify({ code, version: room.version, expires: room.expires, room }) });
      return r.ok ? json({ ok: true }) : json({ error: 'create failed' }, 502);
    }
    if (data.op === 'save' && Number.isInteger(data.version)) {
      const room = data.room;
      const r = await fetch(`${endpoint}?code=eq.${code}&version=eq.${data.version}`, { method: 'PATCH', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify({ version: room.version, expires: room.expires, room }) });
      if (!r.ok) return json({ error: 'save failed' }, 502);
      const rows = await r.json(); return json({ ok: rows.length === 1 });
    }
    return json({ error: 'invalid operation' }, 400);
  } catch { return json({ error: 'room service unavailable' }, 502); }
});

# Friend rooms

Chess and Ludo use private, high-entropy invitation codes. A player receives a separate secret seat credential when they create or join a room; the credential is held in that tab's session storage. Share the invitation code only with people you trust. Rooms expire 24 hours after creation. A room has no public listing. Moves and dice rolls are validated server-side, and room updates use version checks to prevent conflicting moves.

## Hosted online rooms

The deployed application uses the `game-rooms` Supabase function and a private RLS-protected database table. The `SUPABASE_URL` and dedicated `ROOM_GATEWAY_TOKEN` environment variables are server-only; set the same token as a Supabase function secret. Apply the migration and deploy `supabase/functions/game-rooms` before deploying the website. Do not configure `ROOM_STORE=memory` on a multi-instance or serverless deployment: its rooms are local to one process and are lost on restart.

## Local Wi-Fi / LAN rooms

On a trusted computer with Node.js installed, run:

```sh
npm ci
npm run build
ROOM_STORE=memory npm run start -- --hostname 0.0.0.0 --port 3000
```

Find that computer's private LAN address, then open `http://<host-lan-ip>:3000` on each device on the same network. Create a room and share its code with the other players. LAN rooms use the host process's memory and do not need Supabase for game state; they disappear when the host stops. This HTTP setup does **not encrypt** traffic on the LAN. Only use a trusted network, or place the host behind a properly configured HTTPS reverse proxy. The host's firewall must allow the chosen port. Do not expose this local server to the public internet.

These games support solo play against bots and shared rooms. Chess supports two total seats; Ludo supports two to four. The six-player filter is intentionally empty until a game supports six players. Chess uses the `chess.js` rules engine for legal moves, castling, en passant, promotions, checkmate, stalemate and draw detection; players may offer/accept or claim draws. Ludo uses one six to enter, safe squares, captures, exact finish and an additional turn for a six.

## Synchronization and latency

The browser displays deterministic piece moves immediately while the server validates and saves them; if a move fails or its outcome is uncertain, the UI rolls it back and refreshes before allowing another action. Dice rolls and bot moves are always generated on the server. Room versions prevent older responses from overwriting newer game state. While waiting for a player, the browser checks for changes roughly every 650 ms plus network time, with slower checks on your turn and in background tabs. This is polling, not a real-time connection: actual latency depends on the host, network and database, and more frequent checks increase server and database traffic.

For an optional end-to-end API check, start a disposable in-memory LAN server and run `ROOM_TEST_URL=http://127.0.0.1:3000 npm test` in another terminal. Do not point the test at a shared production server; it creates temporary rooms.

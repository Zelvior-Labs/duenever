-- Private server-managed room snapshots. The edge gateway uses the service role;
-- no direct client access or RLS policies are granted.
create table if not exists public.game_rooms (
  code text primary key,
  version integer not null default 0,
  expires bigint not null,
  room jsonb not null
);
alter table public.game_rooms enable row level security;
revoke all on public.game_rooms from anon, authenticated;
create index if not exists game_rooms_expiry_idx on public.game_rooms (expires);

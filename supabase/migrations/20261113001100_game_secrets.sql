-- Hidden game information (the subject's answer, the word to draw, sealed
-- simultaneous answers). Server only: RLS on, no client policies.
create table public.game_secrets (
  game_id uuid primary key references public.games (id) on delete cascade,
  data jsonb not null default '{}'
);
alter table public.game_secrets enable row level security;
revoke all on public.game_secrets from anon, authenticated;

-- Per-game score history for "last 5" bars and the lobby.
create index games_finished on public.games (couple_id, type, finished_at desc) where status = 'finished';

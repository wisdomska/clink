-- The daily ladder: one word puzzle a day, the same for every couple. Turn
-- the start word into the target, changing one letter at a time, every step a
-- real word. You both solve it and compare; your partner's ladder stays hidden
-- until you've finished yours. Server only (the app asks /api/ladder).
create table if not exists public.daily_ladders (
  day date primary key,
  start text not null check (start ~ '^[a-z]{4}$'),
  target text not null check (target ~ '^[a-z]{4}$'),
  par integer not null check (par between 2 and 12)
);
alter table public.daily_ladders enable row level security;
revoke all on public.daily_ladders from anon, authenticated;

create table if not exists public.ladder_results (
  couple_id uuid not null references public.couples (id) on delete cascade,
  day date not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  path text[] not null,
  steps integer not null check (steps between 1 and 30),
  seconds integer not null check (seconds between 0 and 86400),
  finished_at timestamptz not null default now(),
  primary key (couple_id, day, user_id)
);
alter table public.ladder_results enable row level security;
revoke all on public.ladder_results from anon, authenticated;

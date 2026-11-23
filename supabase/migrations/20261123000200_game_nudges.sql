-- A polite nudge in turn-based games: once per turn, and only after the move
-- has waited 12 hours. Server only (the app asks /api/games/[id]/nudge).
create table if not exists public.game_nudges (
  game_id uuid primary key references public.games (id) on delete cascade,
  couple_id uuid not null references public.couples (id) on delete cascade,
  by_user uuid not null references auth.users (id) on delete cascade,
  at timestamptz not null default now(),
  -- the turn this nudge belongs to (the game's last move time)
  turn_since timestamptz not null
);
alter table public.game_nudges enable row level security;
revoke all on public.game_nudges from anon, authenticated;

-- One statement decides it, so two quick taps can't both get through.
create or replace function public.svc_nudge_game(p_game uuid, p_user uuid, p_wait interval default '12 hours')
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  g record;
  ok boolean;
begin
  select id, couple_id, mode, status, current_turn_user, updated_at into g
    from public.games where id = p_game;
  if not found then return 'not_found'; end if;
  if not exists (select 1 from public.couple_members m
                  where m.couple_id = g.couple_id and m.user_id = p_user and m.left_at is null) then
    return 'not_found';
  end if;
  if g.mode <> 'turn' or g.status <> 'active' then return 'over'; end if;
  if g.current_turn_user is null or g.current_turn_user = p_user then return 'your_turn'; end if;
  if g.updated_at > now() - p_wait then return 'not_yet'; end if;
  insert into public.game_nudges as n (game_id, couple_id, by_user, turn_since)
  values (g.id, g.couple_id, p_user, g.updated_at)
  on conflict (game_id) do update
    set by_user = excluded.by_user, at = now(), turn_since = excluded.turn_since
    where n.turn_since < excluded.turn_since
  returning true into ok;
  return case when ok then 'ok' else 'already' end;
end;
$$;
revoke all on function public.svc_nudge_game(uuid, uuid, interval) from public, anon, authenticated;
grant execute on function public.svc_nudge_game(uuid, uuid, interval) to service_role;

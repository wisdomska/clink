-- Head to head, per game: your wins, theirs, and draws, over every finished
-- game of that kind between you two.
create or replace function public.game_record()
returns table (type text, mine bigint, theirs bigint, draws bigint)
language sql stable security definer set search_path = '' as $$
  select g.type,
         count(*) filter (where g.winner_id = auth.uid()),
         count(*) filter (where g.winner_id is not null and g.winner_id <> auth.uid()),
         count(*) filter (where g.is_draw)
    from public.games g
   where g.couple_id = app.my_couple_id() and g.status = 'finished'
   group by g.type
$$;
revoke all on function public.game_record() from public, anon;
grant execute on function public.game_record() to authenticated;

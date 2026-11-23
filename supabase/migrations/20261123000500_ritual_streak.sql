-- The ritual streak: days in a row you both answered the daily prompt. Today
-- counts once you both have; until then it starts from yesterday.
create or replace function public.ritual_streak(p_today date) returns integer
language plpgsql stable security definer set search_path = '' as $$
declare
  cid uuid := app.my_couple_id();
  d date := p_today;
  n integer := 0;
  both_in boolean;
begin
  if cid is null or p_today is null or abs(p_today - (now() at time zone 'utc')::date) > 2 then
    return 0;
  end if;
  loop
    select count(distinct a.user_id) >= 2 into both_in
      from public.ritual_answers a where a.couple_id = cid and a.day = d;
    if not both_in then
      exit when not (n = 0 and d = p_today);
    else
      n := n + 1;
    end if;
    d := d - 1;
    exit when n > 3650;
  end loop;
  return n;
end $$;
revoke all on function public.ritual_streak(date) from public, anon;
grant execute on function public.ritual_streak(date) to authenticated;

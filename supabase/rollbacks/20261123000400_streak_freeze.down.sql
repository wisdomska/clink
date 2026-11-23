-- Undo 20261123000400_streak_freeze.
-- Data: DELETES the freezes, so streaks that a freeze kept may drop back.
drop function if exists public.use_streak_freeze(text);
drop function if exists public.streak_freeze_status();

create or replace function public.clink_streak() returns integer
language plpgsql stable security definer set search_path = '' as $$
declare
  cid uuid := app.my_couple_id();
  tz text := coalesce((select p.timezone from public.profiles p where p.id = auth.uid()), 'UTC');
  d date := (now() at time zone tz)::date;
  streak integer := 0;
  has_day boolean;
begin
  if cid is null then return 0; end if;
  -- today counts if answered; otherwise start from yesterday so the streak is not lost mid-day
  loop
    select exists (
      select 1 from public.clinks c
      where c.couple_id = cid and c.answered_at is not null
        and c.answered_at - c.created_at <= interval '10 minutes'
        and (c.created_at at time zone tz)::date = d
    ) into has_day;
    if not has_day then
      if streak = 0 and d = (now() at time zone tz)::date then
        d := d - 1;
        continue;
      end if;
      exit;
    end if;
    streak := streak + 1;
    d := d - 1;
    exit when streak > 3650;
  end loop;
  return streak;
end $$;
grant execute on function public.clink_streak() to authenticated;

drop function if exists app.streak_from(uuid, text, date, date);
drop table if exists public.streak_freezes;

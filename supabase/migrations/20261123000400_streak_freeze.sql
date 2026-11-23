-- Streak freezes: a couple can protect its clink streak on a day off (travel,
-- an exam, a long flight). Two a month, shared: either of you can use one, for
-- today (planned) or yesterday (the streak just broke). A frozen day keeps the
-- streak going without adding to it.
create table if not exists public.streak_freezes (
  couple_id uuid not null references public.couples (id) on delete cascade,
  day date not null,
  used_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (couple_id, day)
);
alter table public.streak_freezes enable row level security;
revoke all on public.streak_freezes from anon, authenticated;
grant select on public.streak_freezes to authenticated;
create policy streak_freezes_select on public.streak_freezes for select to authenticated
  using (couple_id in (select app.readable_couple_ids()));

/** The streak as of day `d0`, treating `extra` as frozen too (for "if you used a freeze"). */
create or replace function app.streak_from(cid uuid, tz text, d0 date, extra date default null)
returns integer language plpgsql stable security definer set search_path = '' as $$
declare
  d date := d0;
  streak integer := 0;
  steps integer := 0;
  has_day boolean;
  frozen boolean;
begin
  loop
    steps := steps + 1;
    exit when steps > 4000;
    select exists (
      select 1 from public.clinks c
       where c.couple_id = cid and c.answered_at is not null
         and c.answered_at - c.created_at <= interval '10 minutes'
         and (c.created_at at time zone tz)::date = d
    ) into has_day;
    if has_day then
      streak := streak + 1;
    else
      frozen := coalesce(d = extra, false) or exists (select 1 from public.streak_freezes f where f.couple_id = cid and f.day = d);
      if not frozen then
        -- today not done yet doesn't break anything
        if streak = 0 and d = d0 and steps = 1 then
          d := d - 1;
          continue;
        end if;
        exit;
      end if;
    end if;
    d := d - 1;
  end loop;
  return streak;
end $$;

create or replace function public.clink_streak() returns integer
language plpgsql stable security definer set search_path = '' as $$
declare
  cid uuid := app.my_couple_id();
  tz text := coalesce((select p.timezone from public.profiles p where p.id = auth.uid()), 'UTC');
begin
  if cid is null then return 0; end if;
  return app.streak_from(cid, tz, (now() at time zone tz)::date);
end $$;
grant execute on function public.clink_streak() to authenticated;

-- Where the freezes stand: how many are left this month, whether yesterday
-- broke the streak (and what it would be if repaired), and whether today is
-- already frozen or done.
create or replace function public.streak_freeze_status() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  cid uuid := app.my_couple_id();
  tz text := coalesce((select p.timezone from public.profiles p where p.id = auth.uid()), 'UTC');
  today date := (now() at time zone tz)::date;
  used integer;
  now_streak integer;
  repaired integer;
  today_done boolean;
  y_frozen boolean;
begin
  if cid is null then return null; end if;
  select count(*) into used from public.streak_freezes
   where couple_id = cid and date_trunc('month', day) = date_trunc('month', today);
  now_streak := app.streak_from(cid, tz, today);
  repaired := app.streak_from(cid, tz, today, today - 1);
  select exists (
    select 1 from public.clinks c
     where c.couple_id = cid and c.answered_at is not null
       and c.answered_at - c.created_at <= interval '10 minutes'
       and (c.created_at at time zone tz)::date = today
  ) into today_done;
  select exists (select 1 from public.streak_freezes where couple_id = cid and day = today - 1) into y_frozen;
  return jsonb_build_object(
    'left', greatest(0, 2 - used),
    'streak', now_streak,
    -- yesterday broke a streak that a freeze would keep
    'broken', not y_frozen and repaired > now_streak,
    'repaired', repaired,
    'today_frozen', exists (select 1 from public.streak_freezes where couple_id = cid and day = today),
    'today_done', today_done
  );
end $$;
grant execute on function public.streak_freeze_status() to authenticated;

-- Use one: 'today' or 'yesterday'. Locked per couple so two taps at once
-- can't spend three in a month.
create or replace function public.use_streak_freeze(p_day text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  cid uuid := app.my_couple_id();
  tz text := coalesce((select p.timezone from public.profiles p where p.id = auth.uid()), 'UTC');
  today date := (now() at time zone tz)::date;
  d date;
  used integer;
begin
  if cid is null then return 'no_couple'; end if;
  if p_day not in ('today', 'yesterday') then return 'bad_day'; end if;
  d := case when p_day = 'today' then today else today - 1 end;
  perform pg_advisory_xact_lock(hashtext('streak-freeze:' || cid::text));
  if exists (select 1 from public.streak_freezes where couple_id = cid and day = d) then
    return 'already';
  end if;
  select count(*) into used from public.streak_freezes
   where couple_id = cid and date_trunc('month', day) = date_trunc('month', today);
  if used >= 2 then return 'none_left'; end if;
  insert into public.streak_freezes (couple_id, day, used_by) values (cid, d, auth.uid());
  return 'ok';
end $$;
revoke all on function public.use_streak_freeze(text) from public, anon;
grant execute on function public.use_streak_freeze(text) to authenticated;

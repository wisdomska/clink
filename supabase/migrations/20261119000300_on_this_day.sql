-- Who is due an "On this day" nudge right now, in one query: people in a
-- linked couple, between 9am and 9pm in their own time zone, not nudged yet
-- today, with a photo or timeline moment from this date a year or more ago.
create or replace function public.svc_on_this_day_due()
returns table (user_id uuid, years integer, label text, day_key text)
language sql
stable
security definer
set search_path = ''
as $$
  with people as (
    select m.user_id, m.couple_id,
      case when exists (select 1 from pg_catalog.pg_timezone_names z where z.name = p.timezone)
        then p.timezone else 'UTC' end as tz
    from public.couple_members m
    join public.couples c on c.id = m.couple_id and c.unlinked_at is null
    join public.profiles p on p.id = m.user_id
    where p.deleted_at is null and p.suspended_at is null
  ),
  due as (
    select pe.user_id, pe.couple_id, pe.tz, (now() at time zone pe.tz) as lt
    from people pe
    where extract(hour from (now() at time zone pe.tz)) between 9 and 20
      and not exists (
        select 1 from public.notification_log n
        where n.user_id = pe.user_id
          and n.dedupe_key = 'otd:' || to_char(now() at time zone pe.tz, 'YYYY-MM-DD')
      )
  )
  select d.user_id, best.years, best.label, to_char(d.lt, 'YYYY-MM-DD')
  from due d
  cross join lateral (
    select x.years, x.label from (
      select (extract(year from d.lt) - extract(year from t.happened_on))::int as years,
             t.title as label, 1 as pri
      from public.timeline_entries t
      where t.couple_id = d.couple_id
        and to_char(t.happened_on, 'MM-DD') = to_char(d.lt, 'MM-DD')
        and t.happened_on < date_trunc('year', d.lt)::date
      union all
      select (extract(year from d.lt) - extract(year from (md.created_at at time zone d.tz)))::int,
             'a photo you shared', 2
      from public.media md
      where md.couple_id = d.couple_id
        and md.kind = 'image' and not md.is_sensitive and md.status = 'ready'
        and md.deleted_at is null
        and md.created_at < now() - interval '300 days'
        and to_char(md.created_at at time zone d.tz, 'MM-DD') = to_char(d.lt, 'MM-DD')
    ) x
    where x.years >= 1
    order by x.years desc, x.pri
    limit 1
  ) best;
$$;
revoke all on function public.svc_on_this_day_due() from public, anon, authenticated;
grant execute on function public.svc_on_this_day_due() to service_role;

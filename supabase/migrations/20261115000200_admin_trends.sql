-- Admin dashboard trends: daily counts for the last p_days days (UTC), plus
-- the same window before it so the dashboard can show change vs last period.
-- Counts only; no content, no identifiers.
create or replace function public.svc_admin_trends(p_days integer)
returns table (
  day date,
  signups integer,
  links integer,
  clinks integer,
  messages integer,
  games integer,
  active_couples integer
)
language sql stable security definer set search_path = '' as $$
  with days as (
    select generate_series(
      (now() at time zone 'utc')::date - (p_days * 2 - 1),
      (now() at time zone 'utc')::date,
      interval '1 day'
    )::date as day
  ),
  activity as (
    select (created_at at time zone 'utc')::date as day, couple_id from public.clinks
      where created_at >= now() - make_interval(days => p_days * 2)
    union all
    select (sent_at at time zone 'utc')::date, couple_id from public.messages
      where sent_at >= now() - make_interval(days => p_days * 2)
    union all
    select (created_at at time zone 'utc')::date, couple_id from public.games
      where created_at >= now() - make_interval(days => p_days * 2)
  )
  select
    d.day,
    (select count(*)::int from public.profiles p where (p.created_at at time zone 'utc')::date = d.day),
    (select count(*)::int from public.couples c where (c.linked_at at time zone 'utc')::date = d.day),
    (select count(*)::int from public.clinks k where (k.created_at at time zone 'utc')::date = d.day),
    (select count(*)::int from public.messages m where (m.sent_at at time zone 'utc')::date = d.day),
    (select count(*)::int from public.games g where (g.created_at at time zone 'utc')::date = d.day),
    (select count(distinct a.couple_id)::int from activity a where a.day = d.day)
  from days d
  order by d.day;
$$;

revoke execute on function public.svc_admin_trends(integer) from public, anon, authenticated;
grant execute on function public.svc_admin_trends(integer) to service_role;

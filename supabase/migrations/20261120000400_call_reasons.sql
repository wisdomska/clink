-- Calls now record why they didn't go through or ended early
-- ("call:<outcome>:<kind>:<seconds>:<reason>", see features/call/call-reasons).
-- The weekly summary counts a call that connected and then dropped as dropped
-- too, and breaks the week down by reason.
create or replace function public.svc_weekly_health(p_days integer default 7)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with bounds as (
    select now() - make_interval(days => p_days) as cur_from,
           now() - make_interval(days => p_days * 2) as prev_from
  ),
  errs as (
    select e.*, (e.last_at >= b.cur_from) as cur
      from public.error_log e, bounds b
     where e.last_at >= b.prev_from
  ),
  calls as (
    select split_part(m.body, ':', 2) as outcome,
           nullif(split_part(m.body, ':', 4), '')::int as seconds,
           nullif(split_part(m.body, ':', 5), '') as reason,
           (m.sent_at >= b.cur_from) as cur
      from public.messages m, bounds b
     where m.type = 'system' and m.body like 'call:%' and m.sent_at >= b.prev_from
  ),
  pages as (
    select t.path, sum(t.views) as views, sum(t.lcp_sum_ms) as lcp, sum(t.slow) as slow
      from public.page_timings t, bounds b
     where t.day >= (b.cur_from at time zone 'utc')::date
     group by t.path
  )
  select jsonb_build_object(
    'days', p_days,
    'errors', jsonb_build_object(
      'total', coalesce((select sum(count) from errs where cur), 0),
      'kinds', (select count(*) from errs where cur),
      'previous', coalesce((select sum(count) from errs where not cur), 0),
      'top', coalesce((
        select jsonb_agg(x) from (
          select message, source, sum(count) as count, max(path) as path
            from errs where cur group by message, source
            order by sum(count) desc limit 3
        ) x), '[]'::jsonb)
    ),
    'calls', jsonb_build_object(
      'total', (select count(*) from calls where cur),
      'connected', (select count(*) from calls where cur and outcome = 'ended'),
      -- Didn't connect, or connected and then lost (network, or they left Clink).
      'dropped', (select count(*) from calls where cur and (outcome = 'failed' or reason in ('lost', 'away'))),
      'reasons', coalesce((
        select jsonb_object_agg(reason, n) from (
          select reason, count(*) as n from calls where cur and reason is not null group by reason
        ) r), '{}'::jsonb),
      'missed', (select count(*) from calls where cur and outcome in ('missed', 'declined')),
      'minutes', coalesce((select round(sum(seconds) / 60.0) from calls where cur and outcome = 'ended'), 0),
      'previous_total', (select count(*) from calls where not cur),
      'previous_dropped', (select count(*) from calls where not cur and (outcome = 'failed' or reason in ('lost', 'away')))
    ),
    'pages', jsonb_build_object(
      'views', coalesce((select sum(views) from pages), 0),
      'avg_ms', coalesce((select round(sum(lcp)::numeric / nullif(sum(views), 0)) from pages), 0),
      'slow_share', coalesce((select round(sum(slow)::numeric / nullif(sum(views), 0), 3) from pages), 0),
      'slowest', coalesce((
        select jsonb_agg(x) from (
          select path, views, round(lcp::numeric / views) as avg_ms, slow
            from pages where views >= 3
            order by lcp::numeric / views desc limit 5
        ) x), '[]'::jsonb)
    )
  );
$$;
revoke all on function public.svc_weekly_health(integer) from public, anon, authenticated;
grant execute on function public.svc_weekly_health(integer) to service_role;

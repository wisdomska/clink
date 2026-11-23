-- Undo 20261122000100_page_timing_detail.
-- Data: drops the slow-load samples and the four-part split sums (totals stay).
drop function if exists public.svc_log_page_timing(text, integer, jsonb);
drop table if exists public.page_slow_loads;
alter table public.page_timings
  drop column if exists server_sum_ms, drop column if exists wait_sum_ms,
  drop column if exists fetch_sum_ms, drop column if exists render_sum_ms,
  drop column if exists split_views;

create or replace function public.svc_log_page_timing(p_path text, p_lcp_ms integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_lcp_ms is null or p_lcp_ms < 0 or p_lcp_ms > 60000 then return; end if;
  insert into public.page_timings (path, views, lcp_sum_ms, slow)
  values (left(p_path, 200), 1, p_lcp_ms, (p_lcp_ms > 2500)::int)
  on conflict (day, path) do update
    set views = public.page_timings.views + 1,
        lcp_sum_ms = public.page_timings.lcp_sum_ms + excluded.lcp_sum_ms,
        slow = public.page_timings.slow + excluded.slow;
  -- Keep two months.
  if random() < 0.01 then
    delete from public.page_timings where day < (now() at time zone 'utc')::date - 60;
  end if;
end;
$$;
revoke all on function public.svc_log_page_timing(text, integer) from public, anon, authenticated;
grant execute on function public.svc_log_page_timing(text, integer) to service_role;

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

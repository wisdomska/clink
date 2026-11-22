-- Page timings: where the time goes, not just the total. Each first load
-- splits into four parts (Google's breakdown of Largest Contentful Paint):
--   server  - until the first byte of the page arrives
--   wait    - until the main picture starts downloading (0 if text)
--   fetch   - the main picture downloading
--   render  - after that, until it is on screen (scripts, data, drawing)
-- Summed per day and path, like the totals. Slow loads (over 2.5 s) also keep
-- a few plain facts for a fortnight: what the main element was, the network
-- type, installed app or browser. Never who loaded it.
alter table public.page_timings
  add column if not exists server_sum_ms bigint not null default 0,
  add column if not exists wait_sum_ms bigint not null default 0,
  add column if not exists fetch_sum_ms bigint not null default 0,
  add column if not exists render_sum_ms bigint not null default 0,
  add column if not exists split_views integer not null default 0;

create table if not exists public.page_slow_loads (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  path text not null,
  lcp_ms integer not null,
  server_ms integer,
  wait_ms integer,
  fetch_ms integer,
  render_ms integer,
  element text,
  net text,
  installed boolean,
  warm boolean
);
create index if not exists page_slow_loads_at on public.page_slow_loads (at desc);
alter table public.page_slow_loads enable row level security;
revoke all on public.page_slow_loads from anon, authenticated;

drop function if exists public.svc_log_page_timing(text, integer);
create or replace function public.svc_log_page_timing(
  p_path text,
  p_lcp_ms integer,
  p_detail jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s int := least(greatest(coalesce((p_detail->>'server')::int, 0), 0), 60000);
  w int := least(greatest(coalesce((p_detail->>'wait')::int, 0), 0), 60000);
  f int := least(greatest(coalesce((p_detail->>'fetch')::int, 0), 0), 60000);
  r int := least(greatest(coalesce((p_detail->>'render')::int, 0), 0), 60000);
  has_split int := (p_detail ? 'server')::int;
begin
  if p_lcp_ms is null or p_lcp_ms < 0 or p_lcp_ms > 60000 then return; end if;
  insert into public.page_timings
    (path, views, lcp_sum_ms, slow, server_sum_ms, wait_sum_ms, fetch_sum_ms, render_sum_ms, split_views)
  values (left(p_path, 200), 1, p_lcp_ms, (p_lcp_ms > 2500)::int,
          s * has_split, w * has_split, f * has_split, r * has_split, has_split)
  on conflict (day, path) do update
    set views = public.page_timings.views + 1,
        lcp_sum_ms = public.page_timings.lcp_sum_ms + excluded.lcp_sum_ms,
        slow = public.page_timings.slow + excluded.slow,
        server_sum_ms = public.page_timings.server_sum_ms + excluded.server_sum_ms,
        wait_sum_ms = public.page_timings.wait_sum_ms + excluded.wait_sum_ms,
        fetch_sum_ms = public.page_timings.fetch_sum_ms + excluded.fetch_sum_ms,
        render_sum_ms = public.page_timings.render_sum_ms + excluded.render_sum_ms,
        split_views = public.page_timings.split_views + excluded.split_views;

  if p_lcp_ms > 2500 and p_detail is not null then
    insert into public.page_slow_loads
      (path, lcp_ms, server_ms, wait_ms, fetch_ms, render_ms, element, net, installed, warm)
    values (left(p_path, 200), p_lcp_ms, s, w, f, r,
            left(p_detail->>'element', 20), left(p_detail->>'net', 10),
            (p_detail->>'installed')::boolean, (p_detail->>'warm')::boolean);
  end if;

  if random() < 0.01 then
    delete from public.page_timings where day < (now() at time zone 'utc')::date - 60;
    delete from public.page_slow_loads where at < now() - interval '14 days';
  end if;
end;
$$;
revoke all on function public.svc_log_page_timing(text, integer, jsonb) from public, anon, authenticated;
grant execute on function public.svc_log_page_timing(text, integer, jsonb) to service_role;

-- The summary gains the split per slow screen and what slow loads share.
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
           (m.sent_at >= b.cur_from) as cur
      from public.messages m, bounds b
     where m.type = 'system' and m.body like 'call:%' and m.sent_at >= b.prev_from
  ),
  pages as (
    select t.path, sum(t.views) as views, sum(t.lcp_sum_ms) as lcp, sum(t.slow) as slow,
           sum(t.split_views) as split_views, sum(t.server_sum_ms) as server_ms,
           sum(t.wait_sum_ms) as wait_ms, sum(t.fetch_sum_ms) as fetch_ms,
           sum(t.render_sum_ms) as render_ms
      from public.page_timings t, bounds b
     where t.day >= (b.cur_from at time zone 'utc')::date
     group by t.path
  ),
  slow_loads as (
    select s.* from public.page_slow_loads s, bounds b where s.at >= b.cur_from
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
      'dropped', (select count(*) from calls where cur and outcome = 'failed'),
      'missed', (select count(*) from calls where cur and outcome in ('missed', 'declined')),
      'minutes', coalesce((select round(sum(seconds) / 60.0) from calls where cur and outcome = 'ended'), 0),
      'previous_total', (select count(*) from calls where not cur),
      'previous_dropped', (select count(*) from calls where not cur and outcome = 'failed')
    ),
    'pages', jsonb_build_object(
      'views', coalesce((select sum(views) from pages), 0),
      'avg_ms', coalesce((select round(sum(lcp)::numeric / nullif(sum(views), 0)) from pages), 0),
      'slow_share', coalesce((select round(sum(slow)::numeric / nullif(sum(views), 0), 3) from pages), 0),
      'slowest', coalesce((
        select jsonb_agg(x) from (
          select path, views, round(lcp::numeric / views) as avg_ms, slow,
                 case when split_views > 0 then jsonb_build_object(
                   'server', round(server_ms::numeric / split_views),
                   'wait', round(wait_ms::numeric / split_views),
                   'fetch', round(fetch_ms::numeric / split_views),
                   'render', round(render_ms::numeric / split_views)
                 ) end as split
            from pages where views >= 3
            order by lcp::numeric / views desc limit 5
        ) x), '[]'::jsonb),
      'slow_loads', jsonb_build_object(
        'count', (select count(*) from slow_loads),
        'element', (select jsonb_object_agg(k, n) from (
          select coalesce(element, 'unknown') k, count(*) n from slow_loads group by 1) e),
        'net', (select jsonb_object_agg(k, n) from (
          select coalesce(net, 'unknown') k, count(*) n from slow_loads group by 1) e),
        'installed', (select count(*) from slow_loads where installed),
        'warm', (select count(*) from slow_loads where warm)
      )
    )
  );
$$;
revoke all on function public.svc_weekly_health(integer) from public, anon, authenticated;
grant execute on function public.svc_weekly_health(integer) to service_role;

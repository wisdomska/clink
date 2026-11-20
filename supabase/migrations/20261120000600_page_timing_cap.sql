-- Page timings: only loads someone actually watched are sent now (a page
-- opened in the background used to report from when it opened), and anything
-- over 60 s is refused. Drop the samples that came in before the fix.
delete from public.page_timings where lcp_sum_ms > views * 60000::bigint;

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


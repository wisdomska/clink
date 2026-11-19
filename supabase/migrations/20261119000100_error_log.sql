-- In-house error log: what broke, where, and how often. Read only by the
-- server (admin's Errors page). Never holds After Dark or admin screens,
-- query strings, request bodies or anything a couple wrote.
create table if not exists public.error_log (
  id bigint generated always as identity primary key,
  -- Same error, same day: one row with a count, not a flood.
  fingerprint text not null,
  day date not null default (now() at time zone 'utc')::date,
  source text not null check (source in ('client', 'server')),
  message text not null,
  stack text,
  path text,
  release text,
  user_agent text,
  count integer not null default 1,
  first_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  unique (fingerprint, day)
);
create index if not exists error_log_last_at on public.error_log (last_at desc);
alter table public.error_log enable row level security;
revoke all on public.error_log from anon, authenticated;

-- Record one occurrence: a new row, or one more on today's row. Old rows go.
create or replace function public.svc_log_error(
  p_fingerprint text,
  p_source text,
  p_message text,
  p_stack text,
  p_path text,
  p_release text,
  p_user_agent text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.error_log (fingerprint, source, message, stack, path, release, user_agent)
  values (
    left(p_fingerprint, 64), p_source, left(p_message, 500), left(p_stack, 4000),
    left(p_path, 200), left(p_release, 40), left(p_user_agent, 200)
  )
  on conflict (fingerprint, day) do update
    set count = public.error_log.count + 1,
        last_at = now(),
        path = excluded.path,
        user_agent = excluded.user_agent;
  -- Keep a month.
  if random() < 0.02 then
    delete from public.error_log where last_at < now() - interval '30 days';
  end if;
end;
$$;
revoke all on function public.svc_log_error(text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.svc_log_error(text, text, text, text, text, text, text) to service_role;

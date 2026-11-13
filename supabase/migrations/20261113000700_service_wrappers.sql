-- Service-role-only entry points for server routes. Clients cannot execute these.

create or replace function public.svc_effective_tier_rank(p_couple uuid) returns integer
language sql stable security definer set search_path = '' as $$ select app.effective_tier_rank(p_couple) $$;

create or replace function public.svc_desire_matches(p_couple uuid)
returns table (item_id uuid, text text, tier text, kind text)
language sql stable security definer set search_path = '' as $$ select * from app.desire_matches(p_couple) $$;

create or replace function public.svc_admin_metrics() returns jsonb
language sql stable security definer set search_path = '' as $$ select app.admin_metrics() $$;

-- Fixed-window rate limit. Returns true when the call is allowed.
create or replace function public.svc_hit_rate_limit(p_key text, p_window_seconds integer, p_max integer)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  n integer;
begin
  insert into public.rate_limits (key, window_start, count) values (p_key, w, 1)
  on conflict (key, window_start) do update set count = public.rate_limits.count + 1
  returning count into n;
  return n <= p_max;
end $$;

-- Clink back: marks the partner's most recent unanswered clink (within 10 min counts for streak).
create or replace function public.svc_answer_latest_clink(p_couple uuid, p_answerer uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare cid uuid;
begin
  select c.id into cid from public.clinks c
  where c.couple_id = p_couple and c.sender_id <> p_answerer and c.answered_at is null and c.kind <> 'back'
  order by c.created_at desc limit 1;
  if cid is not null then
    update public.clinks set answered_at = now() where id = cid;
  end if;
  return cid;
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'svc_effective_tier_rank(uuid)', 'svc_desire_matches(uuid)', 'svc_admin_metrics()',
    'svc_hit_rate_limit(text,integer,integer)', 'svc_answer_latest_clink(uuid,uuid)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;

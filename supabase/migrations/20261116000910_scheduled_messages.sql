-- Scheduled messages: write now, send later. Text only. Rows are private to the
-- sender until they're delivered (the surprise stays a surprise). All writes go
-- through server routes; a pg_cron job calls the delivery route every minute.

create table if not exists public.scheduled_messages (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  client_id text not null check (char_length(client_id) between 8 and 64),
  body text not null check (char_length(body) between 1 and 4000),
  reply_to uuid references public.messages (id) on delete set null,
  send_at timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'sending', 'sent', 'cancelled', 'failed')),
  claimed_at timestamptz,
  message_id uuid references public.messages (id) on delete set null,
  sent_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  unique (sender_id, client_id)
);
create index if not exists scheduled_messages_due on public.scheduled_messages (send_at)
  where status in ('scheduled', 'sending');
create index if not exists scheduled_messages_sender on public.scheduled_messages (sender_id, status, send_at);

alter table public.scheduled_messages enable row level security;

-- Only the sender can see their queue, and only for a couple they can still read.
create policy scheduled_messages_select on public.scheduled_messages for select to authenticated
  using (sender_id = auth.uid() and couple_id in (select app.readable_couple_ids()));
-- No insert/update/delete policies: the server validates and writes.

-- Claim due rows for delivery (service role only). Rows stuck in "sending" for
-- 5 minutes (a crashed run) are picked up again; client_id keeps it idempotent.
create or replace function public.svc_claim_scheduled_messages(p_limit integer)
returns setof public.scheduled_messages
language plpgsql security definer set search_path = '' as $$
begin
  return query
  update public.scheduled_messages s
     set status = 'sending', claimed_at = now()
   where s.id in (
     select q.id from public.scheduled_messages q
      where q.send_at <= now()
        and (q.status = 'scheduled'
             or (q.status = 'sending' and q.claimed_at < now() - interval '5 minutes'))
      order by q.send_at
      limit greatest(1, least(p_limit, 200))
      for update skip locked
   )
  returning s.*;
end $$;
revoke execute on function public.svc_claim_scheduled_messages(integer) from public, anon, authenticated;
grant execute on function public.svc_claim_scheduled_messages(integer) to service_role;

-- Every minute: deliver due messages through the app (so push notifications go out).
-- Uses the same Vault secrets as app.call_job and quietly does nothing without them.
create or replace function app.call_scheduled_messages() returns void
language plpgsql security definer set search_path = '' as $$
declare
  base text;
  secret text;
begin
  if not exists (
    select 1 from public.scheduled_messages
     where send_at <= now() and status in ('scheduled', 'sending')
  ) then
    return;
  end if;
  select decrypted_secret into base from vault.decrypted_secrets where name = 'clink_app_url' limit 1;
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'clink_cron_secret' limit 1;
  if base is null or secret is null then
    return;
  end if;
  perform net.http_post(
    url := rtrim(base, '/') || '/api/messages/scheduled/run',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 25000
  );
end $$;
revoke execute on function app.call_scheduled_messages() from public, authenticated;

do $$
begin
  perform cron.unschedule('clink-scheduled-messages');
exception when others then null;
end $$;
select cron.schedule('clink-scheduled-messages', '* * * * *', $$select app.call_scheduled_messages()$$);

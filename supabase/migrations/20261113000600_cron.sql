-- Scheduled jobs (spec 13.3). pg_cron runs every 5 minutes and calls the app's
-- secured job route through pg_net. The route URL and shared secret are read from
-- Supabase Vault ("clink_app_url", "clink_cron_secret"); if either is missing the
-- HTTP jobs are skipped, so local and fresh projects never error.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create or replace function app.call_job(job text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  base text;
  secret text;
begin
  select decrypted_secret into base from vault.decrypted_secrets where name = 'clink_app_url' limit 1;
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'clink_cron_secret' limit 1;
  if base is null or secret is null then
    return;
  end if;
  perform net.http_post(
    url := rtrim(base, '/') || '/api/jobs/' || job,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 25000
  );
end $$;
revoke execute on function app.call_job(text) from public, authenticated;

-- Pure SQL housekeeping that needs no storage access.
create or replace function app.housekeeping() returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.rate_limits where window_start < now() - interval '1 day';
  delete from public.age_blocks where blocked_until < now();
  delete from public.invites where expires_at < now() - interval '7 days' and used_at is null;
  delete from public.notification_log where created_at < now() - interval '14 days';
  -- purge-read-only-chats: unlinked couples past the 30-day window lose their chat history
  delete from public.messages m using public.couples c
    where m.couple_id = c.id and c.unlinked_at is not null and c.read_only_until <= now();
end $$;
revoke execute on function app.housekeeping() from public, authenticated;

do $$
begin
  perform cron.unschedule(jobname) from cron.job where jobname like 'clink-%';
exception when others then null;
end $$;

-- Every 5 minutes: media expiry, unlink wipes, date reminders, capsule unlocks.
select cron.schedule('clink-tick', '*/5 * * * *', $$select app.call_job('tick')$$);
-- Daily: account deletion, exports cleanup, housekeeping.
select cron.schedule('clink-daily', '17 3 * * *', $$select app.call_job('daily'); select app.housekeeping();$$);

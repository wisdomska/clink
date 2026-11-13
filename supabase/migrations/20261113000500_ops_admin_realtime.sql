-- Operations: reports, push, jobs, deletion, exports, flags, announcements,
-- realtime authorization and storage buckets.

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users (id) on delete set null,
  couple_id uuid references public.couples (id) on delete set null,
  reported_user_id uuid references auth.users (id) on delete set null,
  category text not null check (category in ('image_misuse', 'harassment', 'minor_safety', 'broken', 'other')),
  details text check (char_length(details) <= 4000),
  attachment_media_ids uuid[] not null default '{}' check (cardinality(attachment_media_ids) <= 5),
  from_after_dark boolean not null default false,
  status text not null default 'open' check (status in ('open', 'triage', 'assigned', 'resolved', 'escalated')),
  priority text not null default 'normal' check (priority in ('normal', 'urgent')),
  assigned_to uuid references auth.users (id) on delete set null,
  resolution text check (char_length(resolution) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reports_status on public.reports (status, created_at desc);
create trigger reports_touch before update on public.reports for each row execute function app.touch_updated_at();

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  ua text,
  created_at timestamptz not null default now(),
  last_ok_at timestamptz
);
create index push_subscriptions_user on public.push_subscriptions (user_id);

create table public.wipe_jobs (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  reason text not null check (reason in ('unlink', 'block', 'delete_account', 'admin_unlink')),
  requested_by uuid references auth.users (id) on delete set null,
  requested_at timestamptz not null default now(),
  executed_at timestamptz,
  verified_at timestamptz,
  objects_deleted integer not null default 0,
  attempts integer not null default 0,
  last_error text
);
create index wipe_jobs_pending on public.wipe_jobs (requested_at) where verified_at is null;

create table public.deletion_requests (
  user_id uuid primary key references auth.users (id) on delete cascade,
  requested_at timestamptz not null default now(),
  execute_after timestamptz not null default now() + interval '30 days',
  done_at timestamptz
);

create table public.export_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  requested_at timestamptz not null default now(),
  ready_at timestamptz,
  storage_path text,
  expires_at timestamptz
);

create table public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  description text,
  updated_at timestamptz not null default now()
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'announcement' check (kind in ('announcement', 'maintenance')),
  body text not null check (char_length(body) between 1 and 280),
  active boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.notification_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null,
  dedupe_key text,
  created_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);

alter table public.reports enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.wipe_jobs enable row level security;
alter table public.deletion_requests enable row level security;
alter table public.export_requests enable row level security;
alter table public.feature_flags enable row level security;
alter table public.announcements enable row level security;
alter table public.notification_log enable row level security;

-- Reporters may see their own reports (status only matters to them). Admin access is server-side.
create policy reports_select_own on public.reports for select to authenticated using (reporter_id = auth.uid());
create policy push_own on public.push_subscriptions for select to authenticated using (user_id = auth.uid());
create policy push_delete_own on public.push_subscriptions for delete to authenticated using (user_id = auth.uid());
create policy deletion_own on public.deletion_requests for select to authenticated using (user_id = auth.uid());
create policy export_own on public.export_requests for select to authenticated using (user_id = auth.uid());
create policy flags_read on public.feature_flags for select to authenticated, anon using (true);
create policy announcements_read on public.announcements for select to authenticated, anon using (active);

-- ---------------------------------------------------------------------------
-- Realtime: one private channel per couple, topic "couple:<id>".
-- Only the two active members can join, send or receive.
-- ---------------------------------------------------------------------------
create policy couple_channel_read on realtime.messages for select to authenticated
  using (realtime.topic() = 'couple:' || app.my_couple_id()::text);
create policy couple_channel_write on realtime.messages for insert to authenticated
  with check (realtime.topic() = 'couple:' || app.my_couple_id()::text);

-- Postgres changes for these tables arrive through the couple filter + RLS.
alter publication supabase_realtime add table public.messages, public.reactions, public.letters,
  public.clinks, public.moods, public.games, public.game_moves, public.presence, public.countdowns,
  public.challenge_days, public.scheduled_dates, public.listen_queue, public.watch_sessions,
  public.timeline_entries, public.couples, public.couple_members, public.ritual_answers;

-- ---------------------------------------------------------------------------
-- Storage (used when STORAGE_DRIVER=supabase; R2 is preferred in production).
-- Both buckets are private. Access is only through short-lived signed URLs minted
-- by server routes, so there are no client policies on storage.objects for them.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', false, 52428800), ('sensitive', 'sensitive', false, 26214400), ('exports', 'exports', false, 104857600)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Admin aggregate metrics. Counts only, no content.
-- ---------------------------------------------------------------------------
create or replace function app.admin_metrics() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'users', (select count(*) from public.profiles where deleted_at is null),
    'signups_7d', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'signups_30d', (select count(*) from public.profiles where created_at > now() - interval '30 days'),
    'couples_active', (select count(*) from public.couples where unlinked_at is null),
    'couples_linked_7d', (select count(*) from public.couples where linked_at > now() - interval '7 days'),
    'activated', (
      select count(*) from public.couples c
      where exists (select 1 from public.games g where g.couple_id = c.id and g.created_at < c.linked_at + interval '24 hours')
         or exists (select 1 from public.scheduled_dates d where d.couple_id = c.id and d.created_at < c.linked_at + interval '24 hours')
         or exists (select 1 from public.watch_sessions w where w.couple_id = c.id and w.created_at < c.linked_at + interval '24 hours')
         or exists (select 1 from public.letters l where l.couple_id = c.id and l.sealed_at < c.linked_at + interval '24 hours')
    ),
    'weekly_retained', (
      select count(*) from public.couples c
      where c.unlinked_at is null
        and (select count(distinct m.sender_id) from public.messages m where m.couple_id = c.id and m.sent_at > now() - interval '7 days') = 2
    ),
    'activity_mix', jsonb_build_object(
      'games', (select count(*) from public.games where created_at > now() - interval '7 days'),
      'dates', (select count(*) from public.scheduled_dates where created_at > now() - interval '7 days'),
      'challenge_days', (select count(*) from public.challenge_days where coalesce(done_by_a, done_by_b) > now() - interval '7 days'),
      'watch', (select count(*) from public.watch_sessions where created_at > now() - interval '7 days'),
      'letters', (select count(*) from public.letters where sealed_at > now() - interval '7 days'),
      'capsules', (select count(*) from public.capsules where created_at > now() - interval '7 days'),
      'messages', (select count(*) from public.messages where sent_at > now() - interval '7 days'),
      'clinks', (select count(*) from public.clinks where created_at > now() - interval '7 days')
    ),
    'dark_opted_in_users', (select count(*) from public.dark_settings where opted_in_at is not null),
    'dark_couples_steamy', (select count(*) from public.couples c where c.unlinked_at is null and app.effective_tier_rank(c.id) >= 2),
    'dare_outcomes', (select coalesce(jsonb_object_agg(outcome, n), '{}') from (select outcome, count(*) n from public.dare_spins where outcome is not null group by outcome) x),
    'reports_open', (select count(*) from public.reports where status in ('open', 'triage', 'assigned', 'escalated')),
    'reports_total', (select count(*) from public.reports),
    'db_bytes', (select pg_database_size(current_database())),
    'media_bytes', (select coalesce(sum(size_bytes), 0) from public.media where deleted_at is null),
    'push_subscriptions', (select count(*) from public.push_subscriptions)
  )
$$;
revoke execute on function app.admin_metrics() from public, authenticated;
grant execute on function app.admin_metrics() to service_role;

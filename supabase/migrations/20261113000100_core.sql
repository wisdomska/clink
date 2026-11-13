-- Clink core: accounts, couples, linking, audit, rate limits.
-- Every couple-scoped row carries couple_id. RLS is on for every table.
-- Helpers live in schema "app", which is not exposed through the Data API.

create extension if not exists pgcrypto;
create extension if not exists citext;

create schema if not exists app;
grant usage on schema app to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- profiles: what a partner may see about you. DOB is NOT here (see user_private).
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) between 1 and 40),
  avatar_kind text not null default 'icon' check (avatar_kind in ('icon', 'photo')),
  avatar_icon text not null default 'moon' check (avatar_icon in ('moon', 'plant', 'cat', 'coffee', 'sparkle')),
  avatar_path text,
  partner_nickname text check (char_length(partner_nickname) <= 40),
  home_city text check (char_length(home_city) <= 80),
  country text check (char_length(country) <= 80),
  timezone text not null default 'UTC',
  latitude numeric(6, 3),
  longitude numeric(6, 3),
  phone text check (phone ~ '^\+?[0-9 ()-]{6,20}$'),
  onboarded_at timestamptz,
  is_admin boolean not null default false,
  suspended_at timestamptz,
  suspended_reason text,
  deleted_at timestamptz,
  -- discreet identity (SET-02)
  app_icon text not null default 'clink' check (app_icon in ('clink', 'notes', 'weather')),
  discreet_mode boolean not null default false,
  -- notification preferences (SET-01)
  notify jsonb not null default '{"clinks":true,"chat":true,"games":true,"dates":true,"keepsakes":true,"dark":false,"detailed":false}',
  quiet_start time not null default '23:00',
  quiet_end time not null default '07:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Private per-user data. Only the user (and the server) can read it.
create table public.user_private (
  user_id uuid primary key references auth.users (id) on delete cascade,
  dob date not null,
  age_verified_at timestamptz,
  age_verification_method text check (age_verification_method in ('self_attest', 'provider')),
  created_at timestamptz not null default now()
);

-- Under-18 attempts: blocked for 24 h by hashed key (ip + device cookie).
create table public.age_blocks (
  key_hash text primary key,
  blocked_until timestamptz not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- couples
-- ---------------------------------------------------------------------------
create table public.couples (
  id uuid primary key default gen_random_uuid(),
  started_on date,
  linked_at timestamptz not null default now(),
  unlinked_at timestamptz,
  read_only_until timestamptz, -- chat kept read-only 30 days after unlink
  ritual_time time not null default '21:00',
  dark_opened_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.couple_members (
  couple_id uuid not null references public.couples (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('a', 'b')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  -- per-member half of "Allow saved spicy media" (both must be true)
  allow_saved_spicy boolean not null default false,
  primary key (couple_id, user_id)
);
create unique index couple_members_one_active on public.couple_members (user_id) where left_at is null;
create unique index couple_members_role on public.couple_members (couple_id, role);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  inviter_id uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null default now() + interval '48 hours',
  used_at timestamptz,
  used_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index invites_inviter on public.invites (inviter_id, created_at desc);

create table public.user_blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

-- ---------------------------------------------------------------------------
-- Audit (security events only) and rate limits
-- ---------------------------------------------------------------------------
create table public.audit_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  actor_id uuid references auth.users (id) on delete set null,
  event text not null,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_events_created on public.audit_events (created_at desc);
create index audit_events_event on public.audit_events (event, created_at desc);

create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (key, window_start)
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function app.my_couple_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select cm.couple_id
  from public.couple_members cm
  join public.couples c on c.id = cm.couple_id
  where cm.user_id = auth.uid() and cm.left_at is null and c.unlinked_at is null
  limit 1
$$;

-- Couples the caller may still READ (active, or unlinked but inside the read-only window).
create or replace function app.readable_couple_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select cm.couple_id
  from public.couple_members cm
  join public.couples c on c.id = cm.couple_id
  where cm.user_id = auth.uid()
    and (c.unlinked_at is null or c.read_only_until > now())
$$;

create or replace function app.partner_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select cm.user_id from public.couple_members cm
  where cm.couple_id = app.my_couple_id() and cm.user_id <> auth.uid() and cm.left_at is null
  limit 1
$$;

create or replace function app.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false)
$$;

grant execute on all functions in schema app to authenticated, service_role;

create or replace function app.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function app.touch_updated_at();

-- A user may not grant themselves admin or lift a suspension.
create or replace function app.guard_profile_privileges() returns trigger
language plpgsql as $$
begin
  if current_user = 'authenticated' then
    if new.is_admin is distinct from old.is_admin
       or new.suspended_at is distinct from old.suspended_at
       or new.suspended_reason is distinct from old.suspended_reason
       or new.deleted_at is distinct from old.deleted_at then
      raise exception 'not allowed' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles
  for each row execute function app.guard_profile_privileges();

-- New auth user -> empty profile row.
create or replace function app.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function app.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.user_private enable row level security;
alter table public.age_blocks enable row level security;
alter table public.couples enable row level security;
alter table public.couple_members enable row level security;
alter table public.invites enable row level security;
alter table public.user_blocks enable row level security;
alter table public.audit_events enable row level security;
alter table public.rate_limits enable row level security;

-- profiles: self and active/read-only partner can read; only self can update.
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or id in (
      select cm.user_id from public.couple_members cm
      where cm.couple_id in (select app.readable_couple_ids())
    )
  );
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- user_private: self only. Writes go through the server (age gate).
create policy user_private_select on public.user_private for select to authenticated
  using (user_id = auth.uid());

-- couples / members: members only. Writes go through the server.
create policy couples_select on public.couples for select to authenticated
  using (id in (select app.readable_couple_ids()));
create policy couples_update on public.couples for update to authenticated
  using (id = app.my_couple_id()) with check (id = app.my_couple_id());
create policy couple_members_select on public.couple_members for select to authenticated
  using (couple_id in (select app.readable_couple_ids()));

-- Guard couples updates from clients: only started_on and ritual_time may change.
create or replace function app.guard_couple_update() returns trigger
language plpgsql as $$
begin
  if current_user = 'authenticated' then
    if new.linked_at is distinct from old.linked_at
       or new.unlinked_at is distinct from old.unlinked_at
       or new.read_only_until is distinct from old.read_only_until
       or new.dark_opened_at is distinct from old.dark_opened_at then
      raise exception 'not allowed' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
create trigger couples_guard before update on public.couples
  for each row execute function app.guard_couple_update();

-- invites: inviter can read their own codes. Creation and acceptance are server-only.
create policy invites_select on public.invites for select to authenticated
  using (inviter_id = auth.uid());

-- audit_events, rate_limits, age_blocks, user_blocks: no client access at all.

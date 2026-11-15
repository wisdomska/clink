-- Admin portal accounts, separate from Clink user accounts. The same email can
-- have a normal Clink account and an admin login; signing into one never
-- signs you into the other. Server only: RLS on, no policies.
create table if not exists public.admin_accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  name text not null default 'Admin',
  password_hash text not null,
  must_change_password boolean not null default true,
  -- Bumped on password change or "sign out everywhere": old sessions stop working.
  session_version integer not null default 1,
  -- Optional link to a Clink user, only so audit rows can name an actor.
  user_id uuid references auth.users (id) on delete set null,
  failed_logins integer not null default 0,
  locked_until timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.admin_accounts enable row level security;
revoke all on public.admin_accounts from anon, authenticated;

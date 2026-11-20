-- The weekly health summary by email, for admins who want it (on by default).
-- admin_digests records each week's send, so a retry or a second run of the
-- daily job never sends twice.
alter table public.admin_accounts add column if not exists weekly_email boolean not null default true;

create table if not exists public.admin_digests (
  week date not null,
  admin_id uuid not null references public.admin_accounts (id) on delete cascade,
  sent_at timestamptz not null default now(),
  primary key (week, admin_id)
);
alter table public.admin_digests enable row level security;
revoke all on public.admin_digests from anon, authenticated;

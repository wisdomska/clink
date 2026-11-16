-- Admin portal: report triage (assignee, internal notes, status history) and
-- a support tool to sign a person out of every device. Server only.

-- Reports are assigned to an admin portal account (admins don't need a Clink
-- account, so the older assigned_to -> auth.users column can't hold them).
alter table public.reports
  add column if not exists assigned_admin_id uuid references public.admin_accounts (id) on delete set null,
  add column if not exists assigned_at timestamptz,
  add column if not exists status_changed_at timestamptz;

create index if not exists reports_priority_created on public.reports (priority desc, created_at desc, id);
create index if not exists reports_category on public.reports (category, created_at desc);

-- Internal notes and the status history of a report, newest last. Never shown
-- to the reporter or the reported person.
create table if not exists public.report_notes (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  admin_id uuid references public.admin_accounts (id) on delete set null,
  kind text not null check (kind in ('note', 'status', 'assign')),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists report_notes_report on public.report_notes (report_id, created_at);
alter table public.report_notes enable row level security;
revoke all on public.report_notes from anon, authenticated;

-- Audit log browsing: newest first, filtered by event prefix or actor.
create index if not exists audit_events_created_id on public.audit_events (created_at desc, id desc);
create index if not exists audit_events_event_created on public.audit_events (event text_pattern_ops, created_at desc);

-- "Sign out everywhere" from the admin portal: removes every auth session for
-- the person (refresh tokens go with them). Couple data is already gated on the
-- session still existing (app.session_live), so access ends straight away.
create or replace function public.svc_admin_revoke_sessions(p_user uuid) returns integer
language plpgsql volatile security definer set search_path = '' as $$
declare n integer;
begin
  delete from auth.sessions where user_id = p_user;
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.svc_admin_revoke_sessions(uuid) from public, anon, authenticated;
grant execute on function public.svc_admin_revoke_sessions(uuid) to service_role;

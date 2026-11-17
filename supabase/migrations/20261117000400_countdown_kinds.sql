-- Countdowns aren't always a flight. Each one has a kind (what you're counting
-- down to) and the details that kind asks for; the board line is built from them.
alter table public.countdowns
  add column if not exists kind text not null default 'visit'
    check (kind in ('visit', 'trip', 'date', 'anniversary', 'birthday', 'event', 'other')),
  add column if not exists details jsonb not null default '{}'::jsonb
    check (jsonb_typeof(details) = 'object' and octet_length(details::text) <= 1000);

grant select (kind, details) on public.countdowns to authenticated;

-- Same view as before (note sealed until zero, caller's couple only), plus the kind.
create or replace view public.countdowns_public with (security_invoker = false) as
  select id, couple_id, title, subtitle, target_at, created_by, created_at,
         case when target_at <= now() then reveal_note end as reveal_note,
         reveal_note is not null as has_note,
         kind, details
  from public.countdowns
  where couple_id = app.my_couple_id();
revoke all on public.countdowns_public from anon;
grant select on public.countdowns_public to authenticated;

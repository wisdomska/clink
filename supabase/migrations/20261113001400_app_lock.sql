-- CHAT-07: optional PIN when Clink opens. Hash and counters are server-only.
alter table public.user_private
  add column app_pin_hash text,
  add column app_pin_failed_count integer not null default 0,
  add column app_pin_locked_until timestamptz;

-- Clients may read their own age-gate row, but never the PIN columns.
revoke select on public.user_private from authenticated, anon;
grant select (user_id, dob, age_verified_at, age_verification_method, created_at)
  on public.user_private to authenticated;

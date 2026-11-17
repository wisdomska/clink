-- Remember why a device's last push failed (e.g. Apple refusing the sender),
-- so delivery problems show up instead of vanishing. Server-side only.
alter table public.push_subscriptions
  add column if not exists last_error text,
  add column if not exists last_error_at timestamptz;

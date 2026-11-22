-- One reminder per link code, a day after it was made if no one has used it.
alter table public.invites add column if not exists reminded_at timestamptz;

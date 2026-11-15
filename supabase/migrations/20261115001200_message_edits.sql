-- Edit a text message within 15 minutes (server only); shows "edited".
alter table public.messages add column if not exists edited_at timestamptz;

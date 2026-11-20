-- Blurred previews for photos shared before previews existed: a background
-- job makes them a few at a time. This marks the ones it has looked at, so a
-- photo it can't read isn't retried forever. Sensitive media is never touched.
alter table public.media add column if not exists placeholder_tried_at timestamptz;
create index if not exists media_placeholder_backfill
  on public.media (created_at desc)
  where kind = 'image' and bucket = 'media' and status = 'ready'
    and placeholder is null and placeholder_tried_at is null and deleted_at is null;

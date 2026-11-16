-- Keyset pagination for the long lists in Keep, Plans, Play and After Dark.
-- Each list orders by one column plus id as a tie-breaker; these indexes match
-- those orders so "rows after the cursor" is an index range scan. No policy
-- changes: every list still reads through the same RLS as before.

create index if not exists letters_couple_keyset
  on public.letters (couple_id, author_id, sealed_at desc, id desc);

create index if not exists capsules_couple_keyset
  on public.capsules (couple_id, unlock_at, id);

create index if not exists timeline_couple_keyset
  on public.timeline_entries (couple_id, happened_on desc, id desc);

create index if not exists scheduled_dates_couple_keyset
  on public.scheduled_dates (couple_id, start_at desc, id desc);

create index if not exists games_finished_keyset
  on public.games (couple_id, finished_at desc, id desc)
  where status = 'finished';

create index if not exists media_sensitive_keyset
  on public.media (couple_id, created_at desc, id desc)
  where is_sensitive;

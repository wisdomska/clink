-- Listen together: queue Spotify and Apple Music links alongside YouTube.
-- `video_id` now holds a service-specific ref:
--   youtube      11-character video id
--   spotify      "{track|album|playlist|episode}/{22-char id}"
--   apple_music  "{storefront}/{kind}/{slug?}/{id}[?i={song id}]"
-- RLS on listen_queue is unchanged (policies already scope rows to the couple).
alter table public.listen_queue
  add column if not exists service text not null default 'youtube';

alter table public.listen_queue drop constraint if exists listen_queue_video_id_check;
alter table public.listen_queue drop constraint if exists listen_queue_service_check;
alter table public.listen_queue drop constraint if exists listen_queue_ref_check;

alter table public.listen_queue
  add constraint listen_queue_service_check
    check (service in ('youtube', 'spotify', 'apple_music')),
  add constraint listen_queue_ref_check check (
    (service = 'youtube' and video_id ~ '^[A-Za-z0-9_-]{11}$')
    or (service = 'spotify' and video_id ~ '^(track|album|playlist|episode)/[A-Za-z0-9]{22}$')
    or (
      service = 'apple_music'
      and char_length(video_id) <= 320
      and video_id ~ '^[a-z]{2}/(album|playlist|song|music-video|station)/([A-Za-z0-9._~%-]{1,200}/)?[A-Za-z0-9._-]{1,80}(\?i=[0-9]{1,20})?$'
    )
  );

alter table public.listen_queue enable row level security;

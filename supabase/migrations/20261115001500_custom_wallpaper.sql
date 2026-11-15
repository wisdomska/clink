-- Custom chat wallpaper: one of your shared photos, optionally blurred.
alter table public.couples drop constraint if exists couples_chat_wallpaper_check;
alter table public.couples add constraint couples_chat_wallpaper_check
  check (chat_wallpaper in ('none', 'glow', 'hearts', 'stars', 'dots', 'waves', 'aurora', 'custom'));
alter table public.couples add column if not exists chat_wallpaper_media uuid references public.media (id) on delete set null;
alter table public.couples add column if not exists chat_wallpaper_blur boolean not null default false;

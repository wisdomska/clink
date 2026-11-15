-- Shared chat look (like Messenger themes): bubble colours and a wallpaper,
-- the same for both partners. Written by the server only.
alter table public.couples add column if not exists chat_theme text not null default 'clink'
  check (chat_theme in ('clink', 'sunset', 'ocean', 'forest', 'berry', 'mono', 'candy', 'midnight'));
alter table public.couples add column if not exists chat_wallpaper text not null default 'none'
  check (chat_wallpaper in ('none', 'glow', 'hearts', 'stars', 'dots', 'waves', 'aurora'));

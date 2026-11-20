-- Link preview cards in chat: title, site, description and a small image,
-- fetched once by the server (never by the couple's devices) and shared by
-- everyone who posts the same link. Read and written only by the server.
create table if not exists public.link_previews (
  url text primary key,
  ok boolean not null default false,
  title text,
  description text,
  site text,
  image text, -- a small inline webp (data URL), so devices never contact the site
  fetched_at timestamptz not null default now()
);
create index if not exists link_previews_fetched_at on public.link_previews (fetched_at);
alter table public.link_previews enable row level security;
revoke all on public.link_previews from anon, authenticated;

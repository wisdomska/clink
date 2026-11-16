-- Gender, used only to show the avatar cast that matches you (anyone who
-- prefers not to say sees everyone). Optional; never shown to anyone else.
alter table public.profiles
  add column if not exists gender text
  check (gender in ('woman', 'man', 'unspecified'));

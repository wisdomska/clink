-- Picture stickers: every sticker is a 3D image; the old text stickers keep
-- their words as a meme-style caption on top of the picture.
alter table public.stickers add column if not exists caption boolean not null default true;

insert into public.stickers (id, pack, label, sort, caption) values
  ('fire', 'starter', 'fire', 22, false),
  ('heart-fire', 'starter', 'heart on fire', 23, false),
  ('melting', 'starter', 'melting', 24, false),
  ('hot-face', 'starter', 'hot', 25, false),
  ('shush', 'starter', 'shh', 26, false),
  ('hungry', 'starter', 'pizza?', 27, true),
  ('cheers', 'starter', 'cheers', 28, false),
  ('sparkle-heart', 'starter', 'sparkly heart', 29, false),
  ('crying', 'starter', 'crying', 30, false),
  ('mind-blown', 'starter', 'mind blown', 31, false),
  ('eyes', 'starter', 'eyes', 32, false),
  ('100', 'starter', '100', 33, false),
  ('rose', 'starter', 'rose', 34, false),
  ('ring', 'starter', 'marry me?', 35, true),
  ('zzz', 'starter', 'sleepy', 36, false)
on conflict (id) do nothing;

-- Write your own status: "custom:<text>" alongside the presets.
alter table public.presence drop constraint if exists presence_status_check;
alter table public.presence add constraint presence_status_check check (
  status in ('free', 'studying', 'cooking', 'working', 'sleeping', 'away')
  or (status like 'custom:%' and char_length(status) between 8 and 47)
);

-- 3D avatar set (Fluent Emoji 3D). Old icon names stay valid.
alter table public.profiles drop constraint if exists profiles_avatar_icon_check;
alter table public.profiles add constraint profiles_avatar_icon_check
  check (avatar_icon in ('woman_light', 'woman_medium', 'woman_dark', 'curly_woman', 'man_light', 'man_medium', 'man_dark', 'beard', 'heart_eyes', 'sunglasses', 'cowboy', 'alien', 'ghost', 'fox', 'cat', 'dog', 'panda', 'bear', 'koala', 'tiger', 'rabbit', 'penguin', 'unicorn', 'frog', 'moon', 'plant', 'coffee', 'sparkle'));

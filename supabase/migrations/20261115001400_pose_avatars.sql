-- Pose avatars: "p-{w|m}-{pose}-{tone}". The classic set stays valid.
alter table public.profiles drop constraint if exists profiles_avatar_icon_check;
alter table public.profiles add constraint profiles_avatar_icon_check check (
  avatar_icon ~ '^p-(w|m)-(wave|ok|sass|shrug|facepalm|dance|run|gym|zen|tech|artist|singer|cook|hero)-(d|l|ml|m|md|k)$'
  or avatar_icon in ('woman_light', 'woman_medium', 'woman_dark', 'curly_woman', 'man_light', 'man_medium',
    'man_dark', 'beard', 'heart_eyes', 'sunglasses', 'cowboy', 'alien', 'ghost', 'fox', 'cat', 'dog', 'panda',
    'bear', 'koala', 'tiger', 'rabbit', 'penguin', 'unicorn', 'frog', 'moon', 'plant', 'coffee', 'sparkle')
);
alter table public.profiles alter column avatar_icon set default 'p-w-wave-m';

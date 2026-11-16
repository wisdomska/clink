-- Memoji avatars: key "m-<person>-<pose>" (10 people x 12 poses, public/memoji).
-- Every stored Fluent pose avatar ("p-{w|m}-{pose}-{tone}") and classic face
-- or animal moves to its memoji (same mapping as src/lib/avatars.ts), then only
-- memoji keys are allowed. RLS is unchanged.
alter table public.profiles drop constraint if exists profiles_avatar_icon_check;

update public.profiles set avatar_icon = case
  when avatar_icon = 'woman_light' then 'm-p03-love'
  when avatar_icon = 'woman_medium' then 'm-p15-love'
  when avatar_icon = 'woman_dark' then 'm-p10-love'
  when avatar_icon = 'curly_woman' then 'm-p10-laugh'
  when avatar_icon = 'man_light' then 'm-p12-love'
  when avatar_icon = 'man_medium' then 'm-p22-love'
  when avatar_icon = 'man_dark' then 'm-p13-love'
  when avatar_icon = 'beard' then 'm-p00-love'
  when avatar_icon = 'heart_eyes' then 'm-p03-love'
  when avatar_icon = 'sunglasses' then 'm-p13-peace'
  when avatar_icon = 'cowboy' then 'm-p26-thumbs'
  when avatar_icon = 'alien' then 'm-p12-shocked'
  when avatar_icon = 'ghost' then 'm-p20-shocked'
  when avatar_icon = 'fox' then 'm-p03-laugh'
  when avatar_icon = 'cat' then 'm-p15-kiss'
  when avatar_icon = 'dog' then 'm-p22-thumbs'
  when avatar_icon = 'panda' then 'm-p18-laugh'
  when avatar_icon = 'bear' then 'm-p26-laugh'
  when avatar_icon = 'koala' then 'm-p20-sleepy'
  when avatar_icon = 'tiger' then 'm-p13-party'
  when avatar_icon = 'rabbit' then 'm-p10-kiss'
  when avatar_icon = 'penguin' then 'm-p18-wave'
  when avatar_icon = 'unicorn' then 'm-p15-party'
  when avatar_icon = 'frog' then 'm-p12-laugh'
  when avatar_icon = 'moon' then 'm-p10-sleepy'
  when avatar_icon = 'plant' then 'm-p00-idea'
  when avatar_icon = 'coffee' then 'm-p22-think'
  when avatar_icon = 'sparkle' then 'm-p20-party'
  when avatar_icon ~ '^p-(w|m)-(wave|ok|gym|sass|hero|shrug|facepalm|dance|run|zen|tech|artist|singer|cook)-(d|l|ml|m|md|k)$' then
    'm-' ||
    case split_part(avatar_icon, '-', 2) || '-' || split_part(avatar_icon, '-', 4)
      when 'w-k' then 'p10'
      when 'w-md' then 'p10'
      when 'w-m' then 'p15'
      when 'w-ml' then 'p15'
      when 'w-l' then 'p03'
      when 'w-d' then 'p03'
      when 'm-k' then 'p13'
      when 'm-md' then 'p13'
      when 'm-m' then 'p22'
      when 'm-ml' then 'p22'
      when 'm-l' then 'p12'
      when 'm-d' then 'p12'
    end || '-' ||
    case split_part(avatar_icon, '-', 3)
      when 'wave' then 'wave'
      when 'ok' then 'thumbs'
      when 'gym' then 'thumbs'
      when 'sass' then 'peace'
      when 'hero' then 'peace'
      when 'shrug' then 'think'
      when 'facepalm' then 'shocked'
      when 'dance' then 'party'
      when 'run' then 'party'
      when 'zen' then 'sleepy'
      when 'tech' then 'idea'
      when 'artist' then 'idea'
      when 'singer' then 'laugh'
      when 'cook' then 'love'
    end
  else 'm-p15-wave'
end
where avatar_icon !~ '^m-(p00|p03|p10|p12|p13|p15|p18|p20|p22|p26)-(wave|heart|kiss|love|laugh|peace|thumbs|shocked|think|sleepy|party|idea)$';

alter table public.profiles add constraint profiles_avatar_icon_check check (
  avatar_icon ~ '^m-(p00|p03|p10|p12|p13|p15|p18|p20|p22|p26)-(wave|heart|kiss|love|laugh|peace|thumbs|shocked|think|sleepy|party|idea)$'
);
alter table public.profiles alter column avatar_icon set default 'm-p15-wave';

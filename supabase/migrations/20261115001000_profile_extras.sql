-- A little more to know about each other: a short bio, love language, and an
-- opt-in to show your birthday (day and month only) to your partner.
alter table public.profiles add column if not exists bio text check (char_length(bio) <= 160);
alter table public.profiles add column if not exists love_language text
  check (love_language in ('words', 'touch', 'time', 'gifts', 'acts'));
alter table public.profiles add column if not exists share_birthday boolean not null default false;

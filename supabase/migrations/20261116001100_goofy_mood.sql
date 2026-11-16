-- "Wired" becomes "Goofy".
alter table public.moods drop constraint if exists moods_mood_check;
update public.moods set mood = 'Goofy' where mood = 'Wired';
alter table public.moods add constraint moods_mood_check check (mood in (
  'Happy', 'Loved', 'Cosy', 'Excited', 'Flirty', 'Grateful', 'Missing you', 'Goofy', 'Tired',
  'Anxious', 'Stressed', 'Low', 'Sad', 'Hurt', 'Jealous', 'Angry', 'Need space'
));

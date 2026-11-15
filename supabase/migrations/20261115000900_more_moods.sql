-- More honest moods (fights happen too), and you can update yours any time.
alter table public.moods drop constraint if exists moods_mood_check;
alter table public.moods add constraint moods_mood_check check (mood in (
  'Happy', 'Loved', 'Cosy', 'Excited', 'Flirty', 'Grateful', 'Missing you', 'Wired', 'Tired',
  'Anxious', 'Stressed', 'Low', 'Sad', 'Hurt', 'Jealous', 'Angry', 'Need space'
));

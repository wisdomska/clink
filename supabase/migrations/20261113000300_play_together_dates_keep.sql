-- Play, Together, Dates and Keepsakes.

-- ---------------------------------------------------------------------------
-- Game content (seeded, admin-editable)
-- ---------------------------------------------------------------------------
create table public.know_me_questions (
  id integer generated always as identity primary key,
  text text not null,
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) = 4),
  sort integer not null default 0,
  enabled boolean not null default true
);

create table public.trivia_questions (
  id integer generated always as identity primary key,
  category text not null check (category in ('Food', 'Travel', 'Music', 'Film', 'Science', 'Words')),
  text text not null,
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) = 4),
  answer_index smallint not null check (answer_index between 0 and 3),
  enabled boolean not null default true
);

create table public.wyr_cards (
  id integer generated always as identity primary key,
  deck text not null check (deck in ('Silly', 'Deep', 'Future', 'Travel')),
  option_a text not null,
  option_b text not null,
  enabled boolean not null default true
);

create table public.draw_words (
  id integer generated always as identity primary key,
  word text not null unique,
  enabled boolean not null default true
);

create table public.story_starters (
  id integer generated always as identity primary key,
  text text not null,
  enabled boolean not null default true
);

-- ---------------------------------------------------------------------------
-- Games
-- ---------------------------------------------------------------------------
create table public.games (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  type text not null check (type in ('know_me', 'draw_guess', 'trivia', 'wyr', 'word', 'story')),
  mode text not null check (mode in ('live', 'turn')),
  status text not null default 'invited' check (status in ('invited', 'active', 'finished', 'abandoned')),
  state jsonb not null default '{}',
  current_turn_user uuid references auth.users (id) on delete set null,
  created_by uuid not null references auth.users (id) on delete cascade,
  winner_id uuid references auth.users (id) on delete set null,
  is_draw boolean not null default false,
  scores jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz
);
create index games_couple on public.games (couple_id, updated_at desc);
create trigger games_touch before update on public.games for each row execute function app.touch_updated_at();

create table public.game_moves (
  id bigint generated always as identity primary key,
  game_id uuid not null references public.games (id) on delete cascade,
  couple_id uuid not null references public.couples (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  move jsonb not null,
  created_at timestamptz not null default now()
);
create index game_moves_game on public.game_moves (game_id, id);

-- ---------------------------------------------------------------------------
-- Together: watch party and listen together
-- ---------------------------------------------------------------------------
create table public.watch_sessions (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  kind text not null default 'watch' check (kind in ('watch', 'listen')),
  video_id text not null check (video_id ~ '^[A-Za-z0-9_-]{11}$'),
  title text check (char_length(title) <= 200),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);
create index watch_sessions_couple on public.watch_sessions (couple_id, created_at desc);

create table public.listen_queue (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  video_id text not null check (video_id ~ '^[A-Za-z0-9_-]{11}$'),
  title text check (char_length(title) <= 200),
  added_by uuid not null references auth.users (id) on delete cascade,
  position integer not null default 0,
  played_at timestamptz,
  created_at timestamptz not null default now()
);
create index listen_queue_couple on public.listen_queue (couple_id, position);

-- ---------------------------------------------------------------------------
-- Dates
-- ---------------------------------------------------------------------------
create table public.date_kits (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  minutes integer not null check (minutes between 10 and 600),
  blurb text not null,
  steps jsonb not null check (jsonb_typeof(steps) = 'array'),
  prompts jsonb not null check (jsonb_typeof(prompts) = 'array'),
  playlist_url text,
  sort integer not null default 0,
  enabled boolean not null default true
);

create table public.scheduled_dates (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  kit_id uuid not null references public.date_kits (id),
  start_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'in_progress', 'completed', 'cancelled')),
  ticket_no integer not null default (floor(random() * 9000) + 1000)::integer,
  created_by uuid not null references auth.users (id) on delete cascade,
  reminded_1d_at timestamptz,
  reminded_1h_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index scheduled_dates_couple on public.scheduled_dates (couple_id, start_at);
create index scheduled_dates_reminders on public.scheduled_dates (start_at) where status = 'scheduled';

create table public.challenge_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  days integer not null check (days in (7, 30)),
  blurb text not null,
  daily_prompt text not null,
  sort integer not null default 0,
  enabled boolean not null default true
);

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  template_id uuid not null references public.challenge_templates (id),
  start_on date not null,
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  created_by uuid not null references auth.users (id) on delete cascade,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index challenges_couple on public.challenges (couple_id, created_at desc);

create table public.challenge_days (
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  couple_id uuid not null references public.couples (id) on delete cascade,
  day integer not null check (day between 1 and 30),
  done_by_a timestamptz,
  done_by_b timestamptz,
  primary key (challenge_id, day)
);

create table public.couple_badges (
  couple_id uuid not null references public.couples (id) on delete cascade,
  badge text not null,
  earned_at timestamptz not null default now(),
  primary key (couple_id, badge)
);

-- ---------------------------------------------------------------------------
-- Keepsakes
-- ---------------------------------------------------------------------------
create table public.letters (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  condition text not null check (char_length(condition) between 3 and 80),
  body text not null check (char_length(body) between 1 and 6000),
  media_id uuid references public.media (id) on delete set null,
  sealed_at timestamptz not null default now(),
  opened_at timestamptz
);
create index letters_couple on public.letters (couple_id, sealed_at desc);

-- Capsule metadata is visible; content lives in capsule_contents and is refused before unlock_at.
create table public.capsules (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 60),
  unlock_at timestamptz not null,
  created_at timestamptz not null default now(),
  opened_at timestamptz,
  notified_at timestamptz,
  check (unlock_at > created_at)
);
create index capsules_couple on public.capsules (couple_id, unlock_at);
create index capsules_unlock on public.capsules (unlock_at) where notified_at is null;

create table public.capsule_contents (
  capsule_id uuid primary key references public.capsules (id) on delete cascade,
  couple_id uuid not null references public.couples (id) on delete cascade,
  body text check (char_length(body) <= 6000),
  media_id uuid references public.media (id) on delete set null
);

create table public.timeline_entries (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  kind text not null check (kind in ('auto', 'manual')),
  title text not null check (char_length(title) between 1 and 120),
  happened_on date not null,
  media_id uuid references public.media (id) on delete set null,
  source_key text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (couple_id, source_key)
);
create index timeline_couple on public.timeline_entries (couple_id, happened_on desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['know_me_questions','trivia_questions','wyr_cards','draw_words','story_starters','date_kits','challenge_templates'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (enabled)', t || '_select', t);
  end loop;
end $$;

-- trivia answers are checked on the server; hide answer_index from clients
revoke select on public.trivia_questions from authenticated;
grant select (id, category, text, options, enabled) on public.trivia_questions to authenticated;

-- Couple-scoped tables: members read; members write while linked.
do $$
declare t text;
begin
  foreach t in array array['games','game_moves','watch_sessions','listen_queue','scheduled_dates','challenges','challenge_days','couple_badges','timeline_entries'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (couple_id in (select app.readable_couple_ids()))', t || '_select', t);
  end loop;
end $$;

-- Writes for games, dates and challenges go through server routes (rules + push).
-- Clients may add to the listen queue, manage scheduled dates and add manual timeline entries.
create policy listen_queue_insert on public.listen_queue for insert to authenticated
  with check (couple_id = app.my_couple_id() and added_by = auth.uid());
create policy listen_queue_update on public.listen_queue for update to authenticated
  using (couple_id = app.my_couple_id()) with check (couple_id = app.my_couple_id());
create policy listen_queue_delete on public.listen_queue for delete to authenticated
  using (couple_id = app.my_couple_id());
create policy timeline_insert on public.timeline_entries for insert to authenticated
  with check (couple_id = app.my_couple_id() and kind = 'manual' and created_by = auth.uid());
create policy timeline_delete on public.timeline_entries for delete to authenticated
  using (couple_id = app.my_couple_id() and kind = 'manual' and created_by = auth.uid());

-- letters: couple can read metadata; body readable by both (Open When opens any time).
alter table public.letters enable row level security;
create policy letters_select on public.letters for select to authenticated
  using (couple_id in (select app.readable_couple_ids()));
create policy letters_insert on public.letters for insert to authenticated
  with check (couple_id = app.my_couple_id() and author_id = auth.uid() and opened_at is null);

-- capsules: metadata readable; contents only after unlock_at, enforced here and in the API.
alter table public.capsules enable row level security;
alter table public.capsule_contents enable row level security;
create policy capsules_select on public.capsules for select to authenticated
  using (couple_id in (select app.readable_couple_ids()));
create policy capsule_contents_select on public.capsule_contents for select to authenticated
  using (
    couple_id in (select app.readable_couple_ids())
    and exists (select 1 from public.capsules c where c.id = capsule_id and c.unlock_at <= now())
  );

-- Lifetime wins per partner (PLAY-08).
create or replace function public.game_rivalry() returns table (user_id uuid, wins bigint)
language sql stable security definer set search_path = '' as $$
  select cm.user_id, count(g.id)
  from public.couple_members cm
  left join public.games g on g.winner_id = cm.user_id and g.couple_id = cm.couple_id and g.status = 'finished'
  where cm.couple_id = app.my_couple_id() and cm.left_at is null
  group by cm.user_id
$$;
grant execute on function public.game_rivalry() to authenticated;

-- Us (home) and Chat: clinks, presence, moods, countdowns, rituals, media, messages.

-- ---------------------------------------------------------------------------
-- media: every upload. Sensitive items live in a separate private bucket.
-- ---------------------------------------------------------------------------
create table public.media (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('image', 'video', 'audio')),
  bucket text not null check (bucket in ('media', 'sensitive')),
  storage_path text not null unique,
  mime text not null,
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 52428800),
  duration_s numeric(6, 2) check (duration_s is null or duration_s <= 180),
  width integer,
  height integer,
  is_sensitive boolean not null default false,
  retention text not null default 'keep' check (retention in ('keep', 'once', '24h', '7d', 'vault')),
  expires_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'ready', 'deleted')),
  is_favourite boolean not null default false,
  viewed_at timestamptz,
  closed_at timestamptz,
  view_count integer not null default 0,
  deleted_at timestamptz,
  storage_verified_gone_at timestamptz,
  created_at timestamptz not null default now(),
  check (is_sensitive = (bucket = 'sensitive')),
  check (not is_sensitive or retention in ('once', '24h', '7d', 'vault')),
  check (is_sensitive or retention = 'keep')
);
create index media_couple on public.media (couple_id, created_at desc);
create index media_expiry on public.media (expires_at) where deleted_at is null;
create index media_once on public.media (closed_at) where retention = 'once' and deleted_at is null;

-- ---------------------------------------------------------------------------
-- clinks
-- ---------------------------------------------------------------------------
create table public.clinks (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'tap' check (kind in ('tap', 'hold', 'back')),
  hold_seconds integer check (hold_seconds is null or hold_seconds between 0 and 3600),
  answers uuid references public.clinks (id) on delete set null,
  answered_at timestamptz,
  created_at timestamptz not null default now()
);
create index clinks_couple on public.clinks (couple_id, created_at desc);

-- ---------------------------------------------------------------------------
-- presence (also mirrored in realtime presence)
-- ---------------------------------------------------------------------------
create table public.presence (
  user_id uuid primary key references auth.users (id) on delete cascade,
  status text not null default 'free' check (status in ('free', 'studying', 'cooking', 'working', 'sleeping', 'away')),
  just_be_here boolean not null default false,
  ambient_on boolean not null default false,
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- moods (once-a-day prompt)
-- ---------------------------------------------------------------------------
create table public.moods (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  mood text not null check (mood in ('Cosy', 'Missing you', 'Wired', 'Tired', 'Flirty', 'Low')),
  note text check (char_length(note) <= 80),
  created_at timestamptz not null default now()
);
create index moods_couple on public.moods (couple_id, created_at desc);

-- ---------------------------------------------------------------------------
-- countdowns (max 5 active per couple)
-- ---------------------------------------------------------------------------
create table public.countdowns (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 60),
  subtitle text check (char_length(subtitle) <= 60),
  target_at timestamptz not null,
  reveal_note text check (char_length(reveal_note) <= 500),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index countdowns_couple on public.countdowns (couple_id, target_at);

create or replace function app.limit_countdowns() returns trigger
language plpgsql as $$
begin
  if (select count(*) from public.countdowns
      where couple_id = new.couple_id and target_at > now()) >= 5 then
    raise exception 'You can keep up to 5 countdowns.' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger countdowns_limit before insert on public.countdowns
  for each row execute function app.limit_countdowns();

-- ---------------------------------------------------------------------------
-- daily ritual (HOME-08)
-- ---------------------------------------------------------------------------
create table public.ritual_prompts (
  id integer primary key,
  text text not null,
  enabled boolean not null default true
);

create table public.ritual_answers (
  couple_id uuid not null references public.couples (id) on delete cascade,
  day date not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  prompt_id integer not null references public.ritual_prompts (id),
  answer text not null check (char_length(answer) between 1 and 500),
  created_at timestamptz not null default now(),
  primary key (couple_id, day, user_id)
);

-- ---------------------------------------------------------------------------
-- stickers
-- ---------------------------------------------------------------------------
create table public.stickers (
  id text primary key,
  pack text not null default 'starter',
  label text not null,
  sort integer not null default 0,
  enabled boolean not null default true
);

create table public.sticker_recents (
  user_id uuid not null references auth.users (id) on delete cascade,
  sticker_id text not null references public.stickers (id) on delete cascade,
  used_at timestamptz not null default now(),
  primary key (user_id, sticker_id)
);

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  client_id text not null check (char_length(client_id) between 8 and 64),
  type text not null check (type in ('text', 'voice', 'media', 'sticker', 'system', 'clink', 'sensitive')),
  body text check (char_length(body) <= 4000),
  reply_to uuid references public.messages (id) on delete set null,
  media_ids uuid[] not null default '{}' check (cardinality(media_ids) <= 10),
  sticker_id text references public.stickers (id),
  sent_at timestamptz not null default now(),
  delivered_at timestamptz,
  read_at timestamptz,
  removed_at timestamptz,
  unique (sender_id, client_id)
);
create index messages_couple on public.messages (couple_id, sent_at desc);

create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  couple_id uuid not null references public.couples (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  emoji text check (char_length(emoji) <= 16),
  voice_media_id uuid references public.media (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (message_id, user_id),
  check (emoji is not null or voice_media_id is not null)
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.media enable row level security;
alter table public.clinks enable row level security;
alter table public.presence enable row level security;
alter table public.moods enable row level security;
alter table public.countdowns enable row level security;
alter table public.ritual_prompts enable row level security;
alter table public.ritual_answers enable row level security;
alter table public.stickers enable row level security;
alter table public.sticker_recents enable row level security;
alter table public.messages enable row level security;
alter table public.reactions enable row level security;

-- media: non-sensitive metadata readable by the couple. Sensitive rows are server-only.
create policy media_select on public.media for select to authenticated
  using (not is_sensitive and deleted_at is null and couple_id in (select app.readable_couple_ids()));
create policy media_update_fav on public.media for update to authenticated
  using (not is_sensitive and couple_id = app.my_couple_id())
  with check (not is_sensitive and couple_id = app.my_couple_id());

create or replace function app.guard_media_update() returns trigger
language plpgsql as $$
begin
  if current_user = 'authenticated' then
    if (to_jsonb(new) - 'is_favourite') is distinct from (to_jsonb(old) - 'is_favourite') then
      raise exception 'not allowed' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
create trigger media_guard before update on public.media
  for each row execute function app.guard_media_update();

-- clinks
create policy clinks_select on public.clinks for select to authenticated
  using (couple_id in (select app.readable_couple_ids()));
create policy clinks_insert on public.clinks for insert to authenticated
  with check (couple_id = app.my_couple_id() and sender_id = auth.uid());

-- presence: self + active partner
create policy presence_select on public.presence for select to authenticated
  using (user_id = auth.uid() or user_id = app.partner_id());
create policy presence_upsert on public.presence for insert to authenticated
  with check (user_id = auth.uid());
create policy presence_update on public.presence for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- moods
create policy moods_select on public.moods for select to authenticated
  using (couple_id in (select app.readable_couple_ids()));
create policy moods_insert on public.moods for insert to authenticated
  with check (couple_id = app.my_couple_id() and user_id = auth.uid());

-- countdowns: whole couple can manage. reveal_note hidden until zero via view below.
create policy countdowns_select on public.countdowns for select to authenticated
  using (couple_id = app.my_couple_id());
create policy countdowns_insert on public.countdowns for insert to authenticated
  with check (couple_id = app.my_couple_id() and created_by = auth.uid());
create policy countdowns_update on public.countdowns for update to authenticated
  using (couple_id = app.my_couple_id()) with check (couple_id = app.my_couple_id());
create policy countdowns_delete on public.countdowns for delete to authenticated
  using (couple_id = app.my_couple_id());

-- Countdowns are read through this view so the note stays sealed until zero.
create view public.countdowns_public with (security_invoker = true) as
  select id, couple_id, title, subtitle, target_at, created_by, created_at,
         case when target_at <= now() then reveal_note end as reveal_note,
         reveal_note is not null as has_note
  from public.countdowns;
revoke select on public.countdowns from authenticated;
grant select (id, couple_id, title, subtitle, target_at, created_by, created_at) on public.countdowns to authenticated;
grant select on public.countdowns_public to authenticated;

-- ritual prompts are public content
create policy ritual_prompts_select on public.ritual_prompts for select to authenticated using (enabled);

-- ritual answers: your own always; partner's only once you have answered the same day.
create policy ritual_answers_select on public.ritual_answers for select to authenticated
  using (
    couple_id = app.my_couple_id()
    and (
      user_id = auth.uid()
      or exists (
        select 1 from public.ritual_answers mine
        where mine.couple_id = ritual_answers.couple_id
          and mine.day = ritual_answers.day
          and mine.user_id = auth.uid()
      )
    )
  );
create policy ritual_answers_insert on public.ritual_answers for insert to authenticated
  with check (couple_id = app.my_couple_id() and user_id = auth.uid());

-- Has the partner answered today? (boolean only, no content)
create or replace function public.ritual_partner_answered(p_day date) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.ritual_answers r
    where r.couple_id = app.my_couple_id() and r.day = p_day and r.user_id = app.partner_id()
  )
$$;
grant execute on function public.ritual_partner_answered(date) to authenticated;

-- stickers
create policy stickers_select on public.stickers for select to authenticated using (enabled);
create policy sticker_recents_all on public.sticker_recents for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- messages: read within the readable window; write only while linked.
create policy messages_select on public.messages for select to authenticated
  using (couple_id in (select app.readable_couple_ids()));
create policy messages_insert on public.messages for insert to authenticated
  with check (
    couple_id = app.my_couple_id()
    and sender_id = auth.uid()
    and type in ('text', 'voice', 'media', 'sticker')
  );
-- Recipients may only set delivered_at / read_at. Senders may only remove.
create policy messages_update on public.messages for update to authenticated
  using (couple_id = app.my_couple_id()) with check (couple_id = app.my_couple_id());

create or replace function app.guard_message_update() returns trigger
language plpgsql as $$
begin
  if current_user = 'authenticated' then
    if new.sender_id = auth.uid() then
      if (to_jsonb(new) - 'removed_at') is distinct from (to_jsonb(old) - 'removed_at') then
        raise exception 'not allowed' using errcode = '42501';
      end if;
      if new.removed_at is not null then
        new.body := null;
      end if;
    else
      if (to_jsonb(new) - 'delivered_at' - 'read_at') is distinct from (to_jsonb(old) - 'delivered_at' - 'read_at') then
        raise exception 'not allowed' using errcode = '42501';
      end if;
    end if;
  end if;
  return new;
end $$;
create trigger messages_guard before update on public.messages
  for each row execute function app.guard_message_update();

-- reactions
create policy reactions_select on public.reactions for select to authenticated
  using (couple_id in (select app.readable_couple_ids()));
create policy reactions_insert on public.reactions for insert to authenticated
  with check (
    couple_id = app.my_couple_id() and user_id = auth.uid()
    and exists (select 1 from public.messages m where m.id = message_id and m.couple_id = app.my_couple_id())
  );
create policy reactions_update on public.reactions for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and couple_id = app.my_couple_id());
create policy reactions_delete on public.reactions for delete to authenticated
  using (user_id = auth.uid());

-- Clink streak: consecutive local days (Europe/London default) with a clink answered within 10 min.
create or replace function public.clink_streak() returns integer
language plpgsql stable security definer set search_path = '' as $$
declare
  cid uuid := app.my_couple_id();
  tz text := coalesce((select p.timezone from public.profiles p where p.id = auth.uid()), 'UTC');
  d date := (now() at time zone tz)::date;
  streak integer := 0;
  has_day boolean;
begin
  if cid is null then return 0; end if;
  -- today counts if answered; otherwise start from yesterday so the streak is not lost mid-day
  loop
    select exists (
      select 1 from public.clinks c
      where c.couple_id = cid and c.answered_at is not null
        and c.answered_at - c.created_at <= interval '10 minutes'
        and (c.created_at at time zone tz)::date = d
    ) into has_day;
    if not has_day then
      if streak = 0 and d = (now() at time zone tz)::date then
        d := d - 1;
        continue;
      end if;
      exit;
    end if;
    streak := streak + 1;
    d := d - 1;
    exit when streak > 3650;
  end loop;
  return streak;
end $$;
grant execute on function public.clink_streak() to authenticated;

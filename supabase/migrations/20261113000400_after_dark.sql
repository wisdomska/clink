-- After Dark (spec section 7). Consent, media and safety rules are enforced on the server.
-- Clients get NO direct table access here: RLS is enabled with no client policies,
-- so every read and write goes through /api/dark/* which re-checks consent, PIN session,
-- tiers and age verification with the service role.

create table public.dark_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  pin_hash text,                    -- argon2id
  pin_failed_count integer not null default 0,
  pin_locked_until timestamptz,
  passkey_credential jsonb,         -- WebAuthn credential for After Dark unlock
  opted_tiers text[] not null default '{}' check (opted_tiers <@ array['Flirty','Steamy','Spicy','Unhinged']),
  opted_in_at timestamptz,
  notice_seen_at timestamptz,       -- SAF-06 one-time screenshot notice
  updated_at timestamptz not null default now()
);

-- Self-attested 18+ declarations (SelfAttestAdapter). One row per user per method.
create table public.age_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  method text not null check (method in ('self_attest', 'provider')),
  status text not null check (status in ('pending', 'passed', 'failed')),
  declaration text,
  signature text,          -- HMAC of user_id|dob|declaration|signed_at
  provider_ref text,
  signed_at timestamptz not null default now()
);
create index age_verifications_user on public.age_verifications (user_id, signed_at desc);

create table public.decks (
  id uuid primary key default gen_random_uuid(),
  tier text not null unique check (tier in ('Flirty', 'Steamy', 'Spicy', 'Unhinged')),
  title text not null,
  sort integer not null default 0,
  enabled boolean not null default true
);

create table public.deck_cards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks (id) on delete cascade,
  text text not null check (char_length(text) between 3 and 300),
  sort integer not null default 0,
  enabled boolean not null default true
);
create index deck_cards_deck on public.deck_cards (deck_id, sort);

create table public.deck_answers (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  card_id uuid not null references public.deck_cards (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  answer text check (char_length(answer) <= 1000),
  passed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (couple_id, card_id, user_id)
);

create table public.desire_items (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  tier text not null check (tier in ('Flirty', 'Steamy', 'Spicy', 'Unhinged')),
  sort integer not null default 0,
  enabled boolean not null default true
);

create table public.desire_answers (
  item_id uuid not null references public.desire_items (id) on delete cascade,
  couple_id uuid not null references public.couples (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  answer text not null check (answer in ('yes', 'no', 'maybe')),
  created_at timestamptz not null default now(),
  primary key (item_id, couple_id, user_id)
);

create table public.dares (
  id uuid primary key default gen_random_uuid(),
  tier text not null check (tier in ('Flirty', 'Steamy', 'Spicy', 'Unhinged')),
  text text not null check (char_length(text) between 3 and 280),
  is_custom boolean not null default false,
  couple_id uuid references public.couples (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  needs_media boolean not null default false,
  sort integer not null default 0,
  enabled boolean not null default true,
  check (is_custom = (couple_id is not null))
);
create index dares_tier on public.dares (tier) where enabled;

create table public.dare_spins (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  spinner_id uuid not null references auth.users (id) on delete cascade,
  dare_id uuid not null references public.dares (id) on delete cascade,
  tier text not null,
  outcome text check (outcome in ('done', 'passed', 'respun')),
  media_id uuid references public.media (id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index dare_spins_couple on public.dare_spins (couple_id, created_at desc);

create table public.nude_requests (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  requester_id uuid not null references auth.users (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  note text check (char_length(note) <= 120),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'later', 'fulfilled', 'cancelled')),
  cooldown_until timestamptz,
  media_id uuid references public.media (id) on delete set null,
  created_at timestamptz not null default now(),
  responded_at timestamptz
);
create index nude_requests_couple on public.nude_requests (couple_id, created_at desc);

-- Sensitive view events (SAF-07 blur / tab-switch) and reveals, security only.
create table public.sensitive_view_events (
  id bigint generated always as identity primary key,
  media_id uuid not null references public.media (id) on delete cascade,
  couple_id uuid not null references public.couples (id) on delete cascade,
  viewer_id uuid not null references auth.users (id) on delete cascade,
  event text not null check (event in ('reveal', 'close', 'blur', 'hidden')),
  created_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['dark_settings','age_verifications','decks','deck_cards','deck_answers','desire_items','desire_answers','dares','dare_spins','nude_requests','sensitive_view_events'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Consent maths: effective tiers are the lower of the two choices.
-- Tier order: Flirty < Steamy < Spicy < Unhinged. A tier is open only if
-- both partners opted into it AND every tier below it. Unhinged also needs
-- both partners age-verified.
-- ---------------------------------------------------------------------------
create or replace function app.tier_rank(t text) returns integer
language sql immutable as $$
  select case t when 'Flirty' then 1 when 'Steamy' then 2 when 'Spicy' then 3 when 'Unhinged' then 4 else 0 end
$$;

create or replace function app.max_contiguous_tier(tiers text[]) returns integer
language sql immutable as $$
  select coalesce(max(r), 0) from generate_series(1, 4) r
  where (select count(distinct x) from unnest(tiers) x where app.tier_rank(x) between 1 and r) = r
$$;

create or replace function app.effective_tier_rank(p_couple uuid) returns integer
language plpgsql stable security definer set search_path = '' as $$
declare
  a uuid; b uuid;
  ra integer; rb integer; r integer;
  verified integer;
begin
  select min(cm.user_id::text)::uuid, max(cm.user_id::text)::uuid into a, b
  from public.couple_members cm where cm.couple_id = p_couple and cm.left_at is null;
  if a is null or b is null or a = b then return 0; end if;
  select app.max_contiguous_tier(coalesce(ds.opted_tiers, '{}')) into ra from public.dark_settings ds where ds.user_id = a;
  select app.max_contiguous_tier(coalesce(ds.opted_tiers, '{}')) into rb from public.dark_settings ds where ds.user_id = b;
  r := least(coalesce(ra, 0), coalesce(rb, 0));
  if r = 4 then
    select count(*) into verified from public.user_private up
    where up.user_id in (a, b) and up.age_verified_at is not null;
    if verified < 2 then r := 3; end if;
  end if;
  return r;
end $$;

grant execute on function app.tier_rank(text), app.max_contiguous_tier(text[]) to authenticated, service_role;
revoke execute on function app.effective_tier_rank(uuid) from public, authenticated;
grant execute on function app.effective_tier_rank(uuid) to service_role;

-- Desire match: only items where both said yes, or one yes and one maybe.
-- A "no" never leaves the database: this is the only read path and it filters them out.
create or replace function app.desire_matches(p_couple uuid) returns table (item_id uuid, text text, tier text, kind text)
language sql stable security definer set search_path = '' as $$
  select i.id, i.text, i.tier,
         case when a1.answer = 'yes' and a2.answer = 'yes' then 'yes' else 'maybe' end
  from public.desire_items i
  join public.desire_answers a1 on a1.item_id = i.id and a1.couple_id = p_couple
  join public.desire_answers a2 on a2.item_id = i.id and a2.couple_id = p_couple and a2.user_id > a1.user_id
  where a1.answer in ('yes', 'maybe') and a2.answer in ('yes', 'maybe')
    and not (a1.answer = 'maybe' and a2.answer = 'maybe')
$$;
revoke execute on function app.desire_matches(uuid) from public, authenticated;
grant execute on function app.desire_matches(uuid) to service_role;

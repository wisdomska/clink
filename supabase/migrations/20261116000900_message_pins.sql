-- Pinned messages: either partner can pin up to 10 messages in the chat.
-- Pins live in their own table because the messages guard only lets senders
-- touch removed_at and recipients touch read receipts.

create table if not exists public.message_pins (
  message_id uuid primary key references public.messages (id) on delete cascade,
  couple_id uuid not null references public.couples (id) on delete cascade,
  pinned_by uuid not null references auth.users (id) on delete cascade,
  pinned_at timestamptz not null default now()
);
create index if not exists message_pins_couple on public.message_pins (couple_id, pinned_at desc);

alter table public.message_pins enable row level security;

create policy message_pins_select on public.message_pins for select to authenticated
  using (couple_id in (select app.readable_couple_ids()));

-- Only while linked, only your own pin, only a live (not removed) chat message
-- from the same couple. System lines, Clinks and private media can't be pinned.
create policy message_pins_insert on public.message_pins for insert to authenticated
  with check (
    couple_id = app.my_couple_id()
    and pinned_by = auth.uid()
    and exists (
      select 1 from public.messages m
      where m.id = message_id
        and m.couple_id = message_pins.couple_id
        and m.removed_at is null
        and m.type in ('text', 'voice', 'media', 'sticker')
    )
  );

-- Either partner may unpin anything in the shared chat.
create policy message_pins_delete on public.message_pins for delete to authenticated
  using (couple_id = app.my_couple_id());

-- Cap at 10 pins per couple.
create or replace function app.limit_message_pins() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.message_pins where couple_id = new.couple_id) >= 10 then
    raise exception 'You can pin up to 10 messages.' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists message_pins_limit on public.message_pins;
create trigger message_pins_limit before insert on public.message_pins
  for each row execute function app.limit_message_pins();

-- Unsending a message also unpins it.
create or replace function app.unpin_removed_message() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.removed_at is not null and old.removed_at is null then
    delete from public.message_pins where message_id = new.id;
  end if;
  return new;
end $$;
drop trigger if exists messages_unpin_removed on public.messages;
create trigger messages_unpin_removed after update of removed_at on public.messages
  for each row execute function app.unpin_removed_message();

alter publication supabase_realtime add table public.message_pins;

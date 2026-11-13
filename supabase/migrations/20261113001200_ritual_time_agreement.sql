-- HOME-08: the ritual time is one both partners agree on. One suggests, the
-- other accepts. Clients can no longer change ritual_time directly.
alter table public.couples
  add column ritual_time_proposed time,
  add column ritual_time_proposed_by uuid references auth.users (id) on delete set null;

create or replace function app.guard_couple_update() returns trigger
language plpgsql as $$
begin
  if current_user = 'authenticated' then
    if new.linked_at is distinct from old.linked_at
       or new.unlinked_at is distinct from old.unlinked_at
       or new.read_only_until is distinct from old.read_only_until
       or new.dark_opened_at is distinct from old.dark_opened_at
       or new.ritual_time is distinct from old.ritual_time
       or new.ritual_time_proposed is distinct from old.ritual_time_proposed
       or new.ritual_time_proposed_by is distinct from old.ritual_time_proposed_by then
      raise exception 'not allowed' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

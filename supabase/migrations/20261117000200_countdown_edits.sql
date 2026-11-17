-- Countdowns can be edited while they're still counting down.
-- Either partner may change the name, board line and moment; only whoever
-- wrote the sealed note may replace it (nobody reads it before zero, and an
-- edit must not let the other person swap it). Once a countdown has reached
-- zero it is a memory and stays as it was.
create or replace function app.guard_countdown_edit() returns trigger
language plpgsql as $$
begin
  if old.target_at <= now() then
    raise exception 'This countdown has already reached zero.' using errcode = 'P0001';
  end if;
  if new.target_at is distinct from old.target_at and new.target_at <= now() then
    raise exception 'Pick a moment in the future.' using errcode = 'P0001';
  end if;
  if new.reveal_note is distinct from old.reveal_note and auth.uid() is distinct from old.created_by then
    raise exception 'Only the person who wrote the note can change it.' using errcode = 'P0001';
  end if;
  new.created_by := old.created_by;
  new.couple_id := old.couple_id;
  new.created_at := old.created_at;
  return new;
end $$;

drop trigger if exists countdowns_guard_edit on public.countdowns;
create trigger countdowns_guard_edit before update on public.countdowns
  for each row execute function app.guard_countdown_edit();

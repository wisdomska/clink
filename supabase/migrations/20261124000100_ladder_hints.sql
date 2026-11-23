-- Daily ladder hints: how many steps a player asked to be shown, so a result
-- with help reads as such next to one without.
alter table public.ladder_results add column if not exists hints integer not null default 0
  check (hints between 0 and 30);
-- Puzzles made before par used everyday words only are remade on next view.
delete from public.daily_ladders d
 where not exists (select 1 from public.ladder_results r where r.day = d.day);

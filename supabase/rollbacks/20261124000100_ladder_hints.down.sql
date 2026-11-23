-- Undo 20261124000100_ladder_hints.
-- Data: forgets how many hints each result used (the results stay).
alter table public.ladder_results drop column if exists hints;

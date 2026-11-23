-- Undo 20261123000600_daily_ladder.
-- Data: DELETES every daily ladder and everyone's results.
drop table if exists public.ladder_results;
drop table if exists public.daily_ladders;

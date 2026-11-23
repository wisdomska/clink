-- Undo 20261123000200_game_nudges. Data: forgets past nudges (harmless).
drop function if exists public.svc_nudge_game(uuid, uuid, interval);
drop table if exists public.game_nudges;

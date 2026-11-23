-- Undo 20261123000100_board_games.
-- Data: DELETES every Oware, Four Up and Draughts game (and their moves), since
-- the old type check can't hold them. Export first if they matter.
delete from public.games where type in ('oware', 'fourup', 'draughts');
alter table public.games drop constraint if exists games_type_check;
alter table public.games add constraint games_type_check
  check (type in ('know_me', 'draw_guess', 'trivia', 'wyr', 'word', 'story', 'rps', 'snap', 'zoom', 'memory'));

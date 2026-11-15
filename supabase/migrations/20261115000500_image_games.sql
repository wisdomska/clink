-- Image games: rock paper scissors, snap challenge, zoom guess, photo memory.
alter table public.games drop constraint if exists games_type_check;
alter table public.games add constraint games_type_check
  check (type in ('know_me', 'draw_guess', 'trivia', 'wyr', 'word', 'story', 'rps', 'snap', 'zoom', 'memory'));

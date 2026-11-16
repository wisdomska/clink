-- More chat looks: bubble themes (solid, outline, paper, duotone) and drawn wallpapers.
-- Every earlier key stays valid. Lists mirror src/features/chat/themes.ts.
alter table public.couples drop constraint if exists couples_chat_theme_check;
alter table public.couples add constraint couples_chat_theme_check
  check (chat_theme in ('clink', 'rouge', 'champagne', 'lilac', 'mint', 'ink', 'wine', 'mono', 'line_rouge', 'line_gold', 'line_lilac', 'line_mint', 'letter', 'kraft', 'blush', 'duo_rouge', 'duo_gold', 'duo_mint', 'duo_ember', 'sunset', 'ocean', 'forest', 'berry', 'candy', 'midnight'));
alter table public.couples drop constraint if exists couples_chat_wallpaper_check;
alter table public.couples add constraint couples_chat_wallpaper_check
  check (chat_wallpaper in ('none', 'dots', 'grain', 'velvet', 'waves', 'stars', 'constellations', 'city', 'two_cities', 'rain', 'aurora', 'hearts', 'polka', 'letters', 'fizz', 'neon', 'glow', 'risograph', 'terrazzo', 'topo', 'botanical', 'memphis', 'custom'));

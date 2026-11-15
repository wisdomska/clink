-- Spicy sticker pack: only offered (and only accepted by the server) when both
-- partners have opted into After Dark.
insert into public.stickers (id, pack, label, sort, caption) values
  ('spicy-wink', 'spicy', 'tonight?', 100, true),
  ('spicy-devil', 'spicy', 'naughty', 101, true),
  ('spicy-pepper', 'spicy', 'spicy', 102, true),
  ('spicy-lips', 'spicy', 'bite', 103, true),
  ('spicy-kiss', 'spicy', 'kiss me', 104, true),
  ('spicy-drool', 'spicy', 'come here', 105, true),
  ('spicy-sweat', 'spicy', 'hot in here', 106, true),
  ('spicy-tongue', 'spicy', 'yum', 107, true),
  ('spicy-peach', 'spicy', 'nice view', 108, true),
  ('spicy-eggplant', 'spicy', 'just saying', 109, true),
  ('spicy-cherries', 'spicy', 'all yours', 110, true),
  ('spicy-lipstick', 'spicy', 'for you', 111, true),
  ('spicy-bikini', 'spicy', 'send pics', 112, true),
  ('spicy-lingerie', 'spicy', 'wearing this', 113, true),
  ('spicy-bed', 'spicy', 'bed. now.', 114, true),
  ('spicy-shower', 'spicy', 'shower?', 115, true),
  ('spicy-bath', 'spicy', 'bath for two', 116, true),
  ('spicy-hearteyes', 'spicy', 'damn', 117, true)
on conflict (id) do nothing;

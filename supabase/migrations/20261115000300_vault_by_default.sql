-- Owner decision: media sent in After Dark is kept in the Vault by default.
-- Each person can still turn "Keep in vault" off in Settings, and the sender
-- can still pick View once or Expires per send, or unsend at any time.
alter table public.couple_members alter column allow_saved_spicy set default true;
update public.couple_members set allow_saved_spicy = true where allow_saved_spicy = false;

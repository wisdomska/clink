-- The nickname you give your partner is yours alone. Signed-in users can read
-- every profile column RLS lets them see except partner_nickname, which only
-- the server (service role) reads, for its owner. New profile columns must be
-- added to this grant to be readable from the browser.
revoke select on public.profiles from authenticated, anon;
grant select (
  id, display_name, avatar_kind, avatar_icon, avatar_path, home_city, country,
  timezone, latitude, longitude, phone, onboarded_at, is_admin, suspended_at,
  suspended_reason, deleted_at, app_icon, discreet_mode, notify, quiet_start,
  quiet_end, created_at, updated_at, bio, love_language, share_birthday, gender
) on public.profiles to authenticated;

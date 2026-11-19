-- A tiny blurred preview of each photo (a ~16px image as a data URL), shown
-- while the real photo loads. Never stored for sensitive (After Dark) media.
alter table public.media
  add column if not exists placeholder text
  check (placeholder is null or (length(placeholder) <= 2000 and placeholder like 'data:image/%'));

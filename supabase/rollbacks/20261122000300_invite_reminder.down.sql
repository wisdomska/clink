-- Undo 20261122000300_invite_reminder.
-- Data: forgets which codes were reminded (a code could be reminded again).
alter table public.invites drop column if exists reminded_at;

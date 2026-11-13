-- Chat and media additions: voice waveforms, video posters, clink system lines.
alter table public.media add column waveform jsonb check (waveform is null or jsonb_typeof(waveform) = 'array');
alter table public.media add column caption text check (char_length(caption) <= 200);
alter table public.media add column dare_spin_id uuid;
alter table public.media add column request_id uuid;

-- Server-written system lines ("Theo sent a Clink, 21:02") need no client insert path.
create index messages_reply on public.messages (reply_to) where reply_to is not null;

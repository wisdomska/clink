-- "Our list": things you want to do together, ticked off together.
create table if not exists public.bucket_items (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  text text not null check (char_length(text) between 1 and 140),
  category text not null default 'do' check (category in ('do', 'go', 'eat', 'watch', 'learn')),
  done_at timestamptz,
  done_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists bucket_items_couple on public.bucket_items (couple_id, created_at desc);
alter table public.bucket_items enable row level security;
create policy bucket_select on public.bucket_items for select to authenticated
  using (couple_id in (select app.readable_couple_ids()));
create policy bucket_insert on public.bucket_items for insert to authenticated
  with check (couple_id = app.my_couple_id() and created_by = auth.uid());
create policy bucket_update on public.bucket_items for update to authenticated
  using (couple_id = app.my_couple_id()) with check (couple_id = app.my_couple_id());
create policy bucket_delete on public.bucket_items for delete to authenticated
  using (couple_id = app.my_couple_id());
alter publication supabase_realtime add table public.bucket_items;

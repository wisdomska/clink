-- Countdowns: the view runs as its owner but filters to the caller's couple itself,
-- so reveal_note stays sealed until zero without column grants getting in the way.
drop view if exists public.countdowns_public;
create view public.countdowns_public with (security_invoker = false) as
  select id, couple_id, title, subtitle, target_at, created_by, created_at,
         case when target_at <= now() then reveal_note end as reveal_note,
         reveal_note is not null as has_note
  from public.countdowns
  where couple_id = app.my_couple_id();
revoke all on public.countdowns_public from anon;
grant select on public.countdowns_public to authenticated;

-- Ritual answers: a policy may not query its own table (infinite recursion).
create or replace function app.answered_ritual(p_couple uuid, p_day date) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.ritual_answers r where r.couple_id = p_couple and r.day = p_day and r.user_id = auth.uid())
$$;
grant execute on function app.answered_ritual(uuid, date) to authenticated;

drop policy if exists ritual_answers_select on public.ritual_answers;
create policy ritual_answers_select on public.ritual_answers for select to authenticated
  using (couple_id = app.my_couple_id() and (user_id = auth.uid() or app.answered_ritual(couple_id, day)));

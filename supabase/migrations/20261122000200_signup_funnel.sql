-- Where new people get stuck, for the owner (admin). Counts only, never who.
-- For everyone who signed up in the window (admins left out), how many have:
--   set up their profile, linked with a partner, sent a clink, and turned on
--   notifications. Plus how many invited someone who hasn't joined yet.
create or replace function public.svc_signup_funnel(p_days integer default 30)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with people as (
    select u.id, p.onboarded_at
      from auth.users u
      join public.profiles p on p.id = u.id
     where u.created_at >= now() - make_interval(days => p_days)
       and not p.is_admin
  ),
  flags as (
    select pe.id,
           pe.onboarded_at is not null as set_up,
           exists (select 1 from public.couple_members m
                    where m.user_id = pe.id and m.left_at is null) as linked,
           exists (select 1 from public.clinks c where c.sender_id = pe.id) as clinked,
           exists (select 1 from public.push_subscriptions s where s.user_id = pe.id) as notify,
           exists (select 1 from public.invites i
                    where i.inviter_id = pe.id and i.used_at is null) as invited
      from people pe
  )
  select jsonb_build_object(
    'days', p_days,
    'steps', jsonb_build_array(
      jsonb_build_object('key', 'signed_up', 'count', (select count(*) from flags)),
      jsonb_build_object('key', 'set_up', 'count', (select count(*) from flags where set_up)),
      jsonb_build_object('key', 'linked', 'count', (select count(*) from flags where linked)),
      jsonb_build_object('key', 'clinked', 'count', (select count(*) from flags where clinked)),
      jsonb_build_object('key', 'notify', 'count', (select count(*) from flags where notify))
    ),
    'waiting_on_partner', (select count(*) from flags where invited and not linked),
    'not_invited', (select count(*) from flags where set_up and not linked and not invited)
  );
$$;
revoke all on function public.svc_signup_funnel(integer) from public, anon, authenticated;
grant execute on function public.svc_signup_funnel(integer) to service_role;

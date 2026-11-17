-- One round trip for every API guard: account status, the active couple, the
-- partner, and (when asked) the couple's After Dark tier. Replaces three to five
-- separate queries per request. Service role only.
create or replace function public.svc_caller(p_user uuid, p_with_rank boolean default false)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  prof record;
  mine record;
  partner_id uuid;
begin
  select suspended_at, deleted_at into prof from public.profiles where id = p_user;
  select m.couple_id, m.role into mine
  from public.couple_members m
  join public.couples c on c.id = m.couple_id
  where m.user_id = p_user and m.left_at is null and c.unlinked_at is null
  limit 1;
  if mine.couple_id is not null then
    select m.user_id into partner_id from public.couple_members m
    where m.couple_id = mine.couple_id and m.user_id <> p_user and m.left_at is null
    limit 1;
  end if;
  return jsonb_build_object(
    'suspended', prof.suspended_at is not null,
    'deleted', prof.deleted_at is not null,
    'couple_id', case when partner_id is null then null else mine.couple_id end,
    'role', mine.role,
    'partner_id', partner_id,
    'rank', case when p_with_rank and partner_id is not null
                 then app.effective_tier_rank(mine.couple_id) else null end
  );
end $$;

revoke execute on function public.svc_caller(uuid, boolean) from public, anon, authenticated;
grant execute on function public.svc_caller(uuid, boolean) to service_role;

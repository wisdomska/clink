-- Admin > Users in one query: search, filters, sorting, the total and one
-- page, done in the database instead of loading every account into the app.
-- Same rules as before: status is deleting > suspended > active/unconfirmed;
-- ties sort by id so pages never shuffle. Server-only (service role).
create or replace function public.svc_admin_users(
  p_q text,
  p_status text,
  p_linked text,
  p_from date,
  p_to date,
  p_sort text,
  p_dir text,
  p_limit integer,
  p_offset integer
)
returns table (
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  email_confirmed_at timestamptz,
  display_name text,
  home_city text,
  suspended_at timestamptz,
  suspended_reason text,
  deleted_at timestamptz,
  is_admin boolean,
  couple_id uuid,
  linked_at timestamptz,
  status text,
  total bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with base as (
    select
      u.id,
      coalesce(u.email, '')::text as email,
      u.created_at,
      u.last_sign_in_at,
      u.email_confirmed_at,
      p.display_name,
      p.home_city,
      p.suspended_at,
      p.suspended_reason,
      p.deleted_at,
      coalesce(p.is_admin, false) as is_admin,
      m.couple_id,
      c.linked_at,
      case
        when p.deleted_at is not null then 'deleting'
        when p.suspended_at is not null then 'suspended'
        when u.email_confirmed_at is not null then 'active'
        else 'unconfirmed'
      end as status
    from auth.users u
    left join public.profiles p on p.id = u.id
    left join lateral (
      select cm.couple_id from public.couple_members cm
      where cm.user_id = u.id and cm.left_at is null
      limit 1
    ) m on true
    left join public.couples c on c.id = m.couple_id
  ),
  f as (
    select * from base b
    where (coalesce(p_q, '') = ''
        or strpos(lower(b.email), lower(p_q)) > 0
        or strpos(lower(coalesce(b.display_name, '')), lower(p_q)) > 0)
      and (p_status is null or b.status = p_status)
      and (p_linked is null or (p_linked = 'linked') = (b.couple_id is not null))
      and (p_from is null or b.created_at >= p_from)
      and (p_to is null or b.created_at < p_to + 1)
  )
  select f.*, count(*) over () as total
  from f
  order by
    case when p_dir = 'asc' then
      case p_sort when 'email' then lower(f.email) when 'name' then lower(coalesce(f.display_name, '')) end
    end asc,
    case when p_dir <> 'asc' then
      case p_sort when 'email' then lower(f.email) when 'name' then lower(coalesce(f.display_name, '')) end
    end desc,
    case when p_dir = 'asc' then
      case p_sort when 'last_sign_in' then f.last_sign_in_at when 'joined' then f.created_at end
    end asc nulls first,
    case when p_dir <> 'asc' then
      case p_sort when 'last_sign_in' then f.last_sign_in_at when 'joined' then f.created_at end
    end desc nulls last,
    f.id
  limit greatest(p_limit, 1)
  offset greatest(p_offset, 0);
$$;
revoke all on function public.svc_admin_users(text, text, text, date, date, text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.svc_admin_users(text, text, text, date, date, text, text, integer, integer)
  to service_role;

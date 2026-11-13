-- ACC-09: "Sign out of all devices" deletes every auth session. Access tokens
-- already issued stay valid until they expire, so couple data is additionally
-- gated on the token's session still existing. Revoked tokens see nothing
-- couple-scoped immediately, well inside the 60 s target.
create or replace function app.session_live() returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when auth.jwt() ->> 'session_id' is null then true -- service role and server jobs
    else exists (
      select 1 from auth.sessions s
      where s.id = (auth.jwt() ->> 'session_id')::uuid
        and (s.not_after is null or s.not_after > now())
    )
  end
$$;
revoke execute on function app.session_live() from public;
grant execute on function app.session_live() to authenticated, service_role;

create or replace function app.my_couple_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select cm.couple_id
  from public.couple_members cm
  join public.couples c on c.id = cm.couple_id
  where cm.user_id = auth.uid() and cm.left_at is null and c.unlinked_at is null
    and app.session_live()
  limit 1
$$;

create or replace function app.readable_couple_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select cm.couple_id
  from public.couple_members cm
  join public.couples c on c.id = cm.couple_id
  where cm.user_id = auth.uid()
    and (c.unlinked_at is null or c.read_only_until > now())
    and app.session_live()
$$;

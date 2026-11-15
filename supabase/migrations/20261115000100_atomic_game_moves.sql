-- Live games: both partners often answer at the same moment. Apply a move's
-- new public state and its hidden secrets in ONE transaction, and only if
-- nobody else moved since the caller read the game (optimistic concurrency).
-- The API retries on a false result, so simultaneous answers never get lost.
create or replace function public.svc_apply_game_move(
  p_game_id uuid,
  p_expected_updated_at timestamptz,
  p_state jsonb,
  p_secrets jsonb,
  p_current_turn_user uuid,
  p_status text,
  p_winner_id uuid,
  p_is_draw boolean,
  p_scores jsonb,
  p_finished_at timestamptz
) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.games
     set state = p_state,
         current_turn_user = p_current_turn_user,
         status = p_status,
         winner_id = p_winner_id,
         is_draw = p_is_draw,
         scores = p_scores,
         finished_at = p_finished_at
   where id = p_game_id
     and updated_at = p_expected_updated_at;
  if not found then
    return false;
  end if;
  update public.game_secrets set data = p_secrets where game_id = p_game_id;
  return true;
end $$;

revoke execute on function public.svc_apply_game_move(
  uuid, timestamptz, jsonb, jsonb, uuid, text, uuid, boolean, jsonb, timestamptz
) from public, anon, authenticated;
grant execute on function public.svc_apply_game_move(
  uuid, timestamptz, jsonb, jsonb, uuid, text, uuid, boolean, jsonb, timestamptz
) to service_role;

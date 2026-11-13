"use client";
import type { RealtimeChannel, REALTIME_SUBSCRIBE_STATES } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/client";

/**
 * Subscribe only after the user's access token is on the realtime socket.
 * Joining earlier subscribes as anon, and RLS then silently filters every
 * postgres_changes event. Returns a cleanup function.
 */
export function subscribeAuthed(
  ch: RealtimeChannel,
  onStatus?: (s: `${REALTIME_SUBSCRIBE_STATES}`) => void,
): () => void {
  const sb = supabaseBrowser();
  let cancelled = false;
  void sb.realtime.setAuth().then(() => {
    if (!cancelled) ch.subscribe((s) => onStatus?.(s));
  });
  return () => {
    cancelled = true;
    void sb.removeChannel(ch);
  };
}

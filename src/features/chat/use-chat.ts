"use client";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useCoupleEvent, useCouple } from "@/features/couple/context";
import type { MediaInfo, Message, Reaction } from "./types";
import { useQueue, type QueuedPayload } from "./queue";
import { subscribeAuthed } from "@/lib/realtime";
import { messagesQuery } from "./messages-query";

type Pages = InfiniteData<Message[], string | null>;

export function useMessages() {
  const { coupleId } = useCouple();
  const qc = useQueryClient();
  const key = useMemo(() => ["messages", coupleId], [coupleId]);

  const q = useInfiniteQuery(messagesQuery(coupleId));

  // Realtime: inserts and updates (read receipts, removals) merge into the cache.
  useEffect(() => {
    const sb = supabaseBrowser();
    const ch = sb
      .channel(`messages:${coupleId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `couple_id=eq.${coupleId}` },
        (payload) => {
          const row = payload.new as Message;
          qc.setQueryData<Pages>(key, (old) => {
            if (!old) return old;
            const pages = old.pages.map((p) => p.filter((m) => m.id !== row.id));
            if (payload.eventType === "DELETE") return { ...old, pages };
            const first = pages[0] ?? [];
            const exists = old.pages.some((p) => p.some((m) => m.id === row.id));
            if (exists) {
              return {
                ...old,
                pages: old.pages.map((p) => p.map((m) => (m.id === row.id ? row : m))),
              };
            }
            return { ...old, pages: [[row, ...first], ...pages.slice(1)] };
          });
          if (payload.eventType === "INSERT") useQueue.getState().remove(row.client_id);
        },
      );
    // Close the gap between the first fetch and the subscription going live.
    return subscribeAuthed(ch, (status) => {
      // A plain marker for tests (and support): new messages arrive live.
      document.documentElement.dataset.chatLive = String(status === "SUBSCRIBED");
      if (status === "SUBSCRIBED")
        void qc.invalidateQueries({ queryKey: key, refetchType: "active" });
    });
  }, [coupleId, key, qc]);

  const messages = useMemo(() => (q.data?.pages.flat() ?? []).slice().reverse(), [q.data]);
  const upsertLocal = useCallback(
    (row: Message) =>
      qc.setQueryData<Pages>(key, (old) => {
        if (!old) return { pages: [[row]], pageParams: [null] };
        if (old.pages.some((p) => p.some((m) => m.id === row.id))) return old;
        return { ...old, pages: [[row, ...(old.pages[0] ?? [])], ...old.pages.slice(1)] };
      }),
    [qc, key],
  );
  return { ...q, messages, upsertLocal };
}

export function useReactions() {
  const { coupleId } = useCouple();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["reactions", coupleId],
    queryFn: async () => {
      const since = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString();
      const { data } = await supabaseBrowser()
        .from("reactions")
        .select("*")
        .gt("created_at", since);
      return data ?? [];
    },
  });
  useEffect(() => {
    const sb = supabaseBrowser();
    const ch = sb
      .channel(`reactions:${coupleId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reactions", filter: `couple_id=eq.${coupleId}` },
        () => qc.invalidateQueries({ queryKey: ["reactions", coupleId] }),
      );
    return subscribeAuthed(
      ch,
      (st) =>
        st === "SUBSCRIBED" && void qc.invalidateQueries({ queryKey: ["reactions", coupleId] }),
    );
  }, [coupleId, qc]);
  // Deletes don't pass the couple filter on realtime, so a removal is also
  // announced on the couple channel.
  useCoupleEvent(
    "chat.reaction",
    () => void qc.invalidateQueries({ queryKey: ["reactions", coupleId] }),
  );
  const byMessage = useMemo(() => {
    const m = new Map<string, Reaction[]>();
    for (const r of q.data ?? []) m.set(r.message_id, [...(m.get(r.message_id) ?? []), r]);
    return m;
  }, [q.data]);
  return byMessage;
}

/** Media metadata for every attachment on screen (RLS hides sensitive rows). */
export function useMediaInfo(ids: string[]) {
  const sorted = useMemo(() => [...new Set(ids)].sort(), [ids]);
  return useQuery({
    queryKey: ["media-info", sorted.join(",")],
    enabled: sorted.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabaseBrowser()
        .from("media")
        .select(
          "id, kind, mime, duration_s, width, height, waveform, status, is_favourite, placeholder",
        )
        .in("id", sorted);
      const map = new Map<string, MediaInfo>();
      for (const m of data ?? []) map.set(m.id, m as MediaInfo);
      return map;
    },
  });
}

/**
 * Replies can quote a message older than what's loaded. Fetch just those
 * originals (RLS keeps them to this couple) so every quote has its preview.
 */
export function useReplyTargets(ids: string[]) {
  const { coupleId } = useCouple();
  const sorted = useMemo(() => [...new Set(ids)].sort(), [ids]);
  return useQuery({
    queryKey: ["reply-targets", coupleId, sorted.join(",")],
    enabled: sorted.length > 0,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabaseBrowser()
        .from("messages")
        .select("*")
        .eq("couple_id", coupleId)
        .in("id", sorted);
      return new Map((data ?? []).map((m) => [m.id, m as Message]));
    },
  });
}

/** Sends one queued payload; marks it failed on network errors. */
export async function sendQueued(
  p: QueuedPayload,
  partnerOnline: boolean,
): Promise<Message | null> {
  const { setFailed, remove } = useQueue.getState();
  try {
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...p, partnerOnline }),
    });
    if (!res.ok) {
      if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
        remove(p.clientId);
        return null;
      }
      throw new Error(String(res.status));
    }
    const { message } = await res.json();
    remove(p.clientId);
    return message as Message;
  } catch {
    setFailed(p.clientId, true);
    return null;
  }
}

/** Retries the whole outbox when the connection comes back (and on mount). */
export function useOutboxFlush(onSent: (m: Message) => void, partnerOnline: boolean) {
  const busy = useRef(false);
  const flush = useCallback(async () => {
    if (busy.current || !navigator.onLine) return;
    busy.current = true;
    try {
      for (const item of useQueue.getState().items) {
        const m = await sendQueued(item, partnerOnline);
        if (m) onSent(m);
      }
    } finally {
      busy.current = false;
    }
  }, [onSent, partnerOnline]);
  useEffect(() => {
    void flush();
    // "online" can fire a moment before the connection really works, so give
    // it a beat, and keep trying every few seconds while anything is waiting:
    // a single failed retry must never leave a message stuck as "Not sent".
    let beat: ReturnType<typeof setTimeout> | undefined;
    const online = () => {
      clearTimeout(beat);
      beat = setTimeout(() => void flush(), 800);
    };
    const again = setInterval(() => {
      // Only once something has failed, so this never races a first send
      // (the server ignores duplicates anyway: one row per client id).
      if (Object.values(useQueue.getState().failed).some(Boolean)) void flush();
    }, 6000);
    window.addEventListener("online", online);
    return () => {
      window.removeEventListener("online", online);
      clearTimeout(beat);
      clearInterval(again);
    };
  }, [flush]);
  return flush;
}

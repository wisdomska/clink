"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { CoupleContextValue, PartnerPresence, PresenceStatus } from "./types";

type Handler = (payload: Record<string, unknown>) => void;

interface CoupleRuntime extends CoupleContextValue {
  /** Broadcast on the private couple channel (couple:<id>). */
  send: (event: string, payload: Record<string, unknown>) => void;
  /** Subscribe to a broadcast event. Returns an unsubscribe function. */
  on: (event: string, fn: Handler) => () => void;
  connected: boolean;
  presence: PartnerPresence;
  myStatus: PresenceStatus;
  setMyStatus: (s: PresenceStatus) => void;
}

const Ctx = createContext<CoupleRuntime | null>(null);

export function useCouple(): CoupleRuntime {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCouple outside CoupleProvider");
  return v;
}

const HEARTBEAT_MS = 30_000;

export function CoupleProvider({ value, children }: { value: CoupleContextValue; children: React.ReactNode }) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const handlers = useRef(new Map<string, Set<Handler>>());
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState<PartnerPresence>({ online: false, status: "free", lastSeen: null });
  const [myStatus, setMyStatusState] = useState<PresenceStatus>("free");
  const statusRef = useRef<PresenceStatus>("free");

  useEffect(() => {
    const sb = supabaseBrowser();
    let disposed = false;
    let heartbeat: ReturnType<typeof setInterval> | undefined;

    // Load stored status for both of us.
    void sb
      .from("presence")
      .select("user_id, status, last_seen_at")
      .in("user_id", [value.me.id, value.partner.id])
      .then(({ data }) => {
        const mine = data?.find((r) => r.user_id === value.me.id);
        const theirs = data?.find((r) => r.user_id === value.partner.id);
        if (mine) {
          statusRef.current = mine.status as PresenceStatus;
          setMyStatusState(mine.status as PresenceStatus);
        }
        if (theirs) setPresence((p) => ({ ...p, status: theirs.status as PresenceStatus, lastSeen: theirs.last_seen_at }));
      });

    (async () => {
      await sb.realtime.setAuth();
      if (disposed) return;
      const ch = sb.channel(`couple:${value.coupleId}`, {
        config: { private: true, broadcast: { self: false, ack: false }, presence: { key: value.me.id } },
      });
      ch.on("broadcast", { event: "*" }, ({ event, payload }) => {
        handlers.current.get(event)?.forEach((fn) => fn(payload ?? {}));
        handlers.current.get("*")?.forEach((fn) => fn({ event, ...(payload ?? {}) }));
      });
      ch.on("presence", { event: "sync" }, () => {
        const state = ch.presenceState<{ status: PresenceStatus; at: string }>();
        const theirs = state[value.partner.id]?.[0];
        setPresence((p) => ({
          online: Boolean(theirs),
          status: theirs?.status ?? p.status,
          lastSeen: theirs?.at ?? p.lastSeen,
        }));
      });
      ch.subscribe(async (status) => {
        setConnected(status === "SUBSCRIBED");
        if (status !== "SUBSCRIBED") return;
        const track = () => ch.track({ status: statusRef.current, at: new Date().toISOString() });
        await track();
        heartbeat = setInterval(() => {
          void track();
          sb.from("presence").upsert({ user_id: value.me.id, status: statusRef.current, last_seen_at: new Date().toISOString() }).then(() => undefined);
        }, HEARTBEAT_MS);
      });
      channelRef.current = ch;
    })();

    const onHide = () => {
      if (document.visibilityState === "hidden") {
        sb.from("presence").upsert({ user_id: value.me.id, status: statusRef.current, last_seen_at: new Date().toISOString() }).then(() => undefined);
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      disposed = true;
      clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", onHide);
      if (channelRef.current) void sb.removeChannel(channelRef.current);
      channelRef.current = null;
    };
  }, [value.coupleId, value.me.id, value.partner.id]);

  const send = useCallback((event: string, payload: Record<string, unknown>) => {
    void channelRef.current?.send({ type: "broadcast", event, payload });
  }, []);

  const on = useCallback((event: string, fn: Handler) => {
    const set = handlers.current.get(event) ?? new Set<Handler>();
    set.add(fn);
    handlers.current.set(event, set);
    return () => {
      set.delete(fn);
    };
  }, []);

  const setMyStatus = useCallback(
    (s: PresenceStatus) => {
      statusRef.current = s;
      setMyStatusState(s);
      void channelRef.current?.track({ status: s, at: new Date().toISOString() });
      supabaseBrowser().from("presence").upsert({ user_id: value.me.id, status: s, last_seen_at: new Date().toISOString() }).then(() => undefined);
    },
    [value.me.id],
  );

  const runtime = useMemo<CoupleRuntime>(
    () => ({ ...value, send, on, connected, presence, myStatus, setMyStatus }),
    [value, send, on, connected, presence, myStatus, setMyStatus],
  );
  return <Ctx.Provider value={runtime}>{children}</Ctx.Provider>;
}

/** Subscribe to one broadcast event for the component's lifetime. */
export function useCoupleEvent(event: string, fn: Handler) {
  const { on } = useCouple();
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  });
  useEffect(() => on(event, (p) => ref.current(p)), [on, event]);
}

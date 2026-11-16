"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useCouple, useCoupleEvent } from "@/features/couple/context";
import {
  SPOTIFY_JOIN_EVENT,
  SPOTIFY_STATE_EVENT,
  SpotifySync,
  readSpotifyState,
  type PlaybackUpdate,
} from "./spotify-sync";

/* Minimal typings for the Spotify iFrame API. */
interface SpotifyEmbedController {
  loadUri(uri: string): void;
  play(): void;
  pause(): void;
  resume(): void;
  togglePlay(): void;
  seek(seconds: number): void;
  destroy(): void;
  addListener(event: "ready", fn: () => void): void;
  addListener(event: "playback_update", fn: (e: { data: PlaybackUpdate }) => void): void;
}
interface SpotifyIFrameAPI {
  createController(
    el: HTMLElement,
    opts: { uri: string; width?: number | string; height?: number | string },
    cb: (c: SpotifyEmbedController) => void,
  ): void;
}
declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: SpotifyIFrameAPI) => void;
  }
}

const SCRIPT = "https://open.spotify.com/embed/iframe-api/v1";
const LOAD_TIMEOUT_MS = 10_000;
const HEARTBEAT_MS = 4000;
let loading: Promise<SpotifyIFrameAPI> | null = null;

/** Load the Spotify iFrame API once, on first use. A failed load can be retried later. */
function loadSpotify(): Promise<SpotifyIFrameAPI> {
  if (loading) return loading;
  loading = new Promise<SpotifyIFrameAPI>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Spotify API timed out")), LOAD_TIMEOUT_MS);
    const prev = window.onSpotifyIframeApiReady;
    window.onSpotifyIframeApiReady = (api) => {
      clearTimeout(timer);
      prev?.(api);
      resolve(api);
    };
    const s = document.createElement("script");
    s.src = SCRIPT;
    s.async = true;
    s.onerror = () => {
      clearTimeout(timer);
      s.remove();
      reject(new Error("Spotify API failed to load"));
    };
    document.head.appendChild(s);
  }).catch((e: unknown) => {
    loading = null;
    throw e;
  });
  return loading;
}

/**
 * Spotify embed kept in step on both devices. Play, pause and seek in the
 * embed broadcast a state; the partner mirrors it. The person who queued the
 * song sends a heartbeat every 4 s while playing so drift gets corrected.
 * Falls back to `fallback` (the plain embed) when the iFrame API can't load.
 */
export function SyncedSpotify({
  sessionId,
  uri,
  title,
  height,
  leader,
  onEnded,
  fallback,
}: {
  sessionId: string;
  uri: string;
  title: string;
  height: number;
  leader: boolean;
  onEnded?: () => void;
  fallback: ReactNode;
}) {
  const { send, partner } = useCouple();
  const host = useRef<HTMLDivElement>(null);
  const sync = useRef<SpotifySync | null>(null);
  const ended = useRef(onEnded);
  const label = useRef(title);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [partnerHere, setPartnerHere] = useState(false);
  const [drift, setDrift] = useState<number | null>(null);

  useEffect(() => {
    ended.current = onEnded;
    label.current = title;
  });

  useEffect(() => {
    const node = host.current;
    let disposed = false;
    let ctrl: SpotifyEmbedController | null = null;
    loadSpotify()
      .then((api) => {
        if (disposed || !node) return;
        // The API replaces the element it is given, so hand it one React doesn't own.
        const el = document.createElement("div");
        node.appendChild(el);
        api.createController(el, { uri, width: "100%", height }, (c) => {
          if (disposed) return c.destroy();
          ctrl = c;
          const s = new SpotifySync({
            adapter: c,
            track: uri,
            send: (m) => send(SPOTIFY_STATE_EVENT, { session: sessionId, ...m }),
            onEnded: () => ended.current?.(),
          });
          sync.current = s;
          c.addListener("ready", () => {
            if (disposed) return;
            setStatus("ready");
            node.querySelector("iframe")?.setAttribute("title", label.current);
            send(SPOTIFY_JOIN_EVENT, { session: sessionId });
          });
          c.addListener("playback_update", (e) => {
            if (!disposed && e?.data) s.onLocalUpdate(e.data);
          });
        });
      })
      .catch(() => {
        if (!disposed) setStatus("failed");
      });
    return () => {
      disposed = true;
      sync.current = null;
      ctrl?.destroy();
      node?.replaceChildren();
    };
  }, [uri, height, sessionId, send]);

  useEffect(() => {
    if (!leader) return;
    const t = setInterval(() => {
      const s = sync.current;
      if (s && !s.paused && !s.suppressed()) {
        send(SPOTIFY_STATE_EVENT, { session: sessionId, ...s.snapshot() });
      }
    }, HEARTBEAT_MS);
    return () => clearInterval(t);
  }, [leader, send, sessionId]);

  useCoupleEvent(SPOTIFY_JOIN_EVENT, (p) => {
    if (p.session !== sessionId) return;
    setPartnerHere(true);
    send("listen.spotify.here", { session: sessionId });
    const s = sync.current;
    // Catch the newcomer up: the leader always, anyone else only while playing.
    if (s && (leader || !s.paused)) {
      send(SPOTIFY_STATE_EVENT, { session: sessionId, ...s.snapshot() });
    }
  });
  useCoupleEvent("listen.spotify.here", (p) => {
    if (p.session === sessionId) setPartnerHere(true);
  });
  useCoupleEvent(SPOTIFY_STATE_EVENT, (p) => {
    if (p.session !== sessionId) return;
    setPartnerHere(true);
    const st = readSpotifyState(p);
    const r = st && sync.current?.applyRemote(st);
    if (r) setDrift(r.drift);
  });

  if (status === "failed") return <>{fallback}</>;
  return (
    <div className="flex flex-col gap-2">
      <div
        className="rounded-card border-line bg-s1 relative w-full overflow-hidden border"
        style={{ height }}
      >
        <div ref={host} className="h-full w-full [&>iframe]:block [&>iframe]:border-0" />
        {status === "loading" && (
          <div className="mono text-faint absolute inset-0 flex items-center justify-center text-xs">
            Loading player
          </div>
        )}
      </div>
      <div className="text-muted flex items-center gap-1.5 text-xs" aria-live="polite">
        <span
          aria-hidden
          className={`h-1.5 w-1.5 rounded-full ${partnerHere ? "bg-accent" : "bg-line"}`}
        />
        {partnerHere
          ? `In step with ${partner.name}${drift !== null ? ` · ${drift.toFixed(1)} s apart` : ""}`
          : `Waiting on ${partner.name} to open the player`}
      </div>
    </div>
  );
}

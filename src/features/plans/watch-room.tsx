"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Play, Pause } from "@phosphor-icons/react";
import { useCouple, useCoupleEvent } from "@/features/couple/context";
import { IconButton } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { toast } from "@/components/ui/toast";
import { loadYouTube, expectedPosition, DRIFT_LIMIT, type YTPlayer } from "./youtube-player";

const REACTIONS = ["😂", "🔥", "😭", "🥹"];

function fmt(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

/**
 * Synced YouTube player. Play, pause and seek broadcast watch.state; the other
 * side corrects drift over 500 ms. The starter sends a heartbeat every 4 s.
 */
export function SyncedPlayer({
  sessionId,
  videoId,
  leader,
  audioOnly = false,
  onEnded,
}: {
  sessionId: string;
  videoId: string;
  leader: boolean;
  audioOnly?: boolean;
  onEnded?: () => void;
}) {
  const { send, partner } = useCouple();
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const applying = useRef(false);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(0);
  const [drift, setDrift] = useState<number | null>(null);
  const [partnerHere, setPartnerHere] = useState(false);
  const [floats, setFloats] = useState<Array<{ id: number; e: string; x: number }>>([]);

  const broadcast = useCallback(
    (p: boolean) => {
      const pl = player.current;
      if (!pl) return;
      send("watch.state", {
        session: sessionId,
        video: videoId,
        playing: p,
        position: pl.getCurrentTime(),
        sentAt: Date.now(),
      });
    },
    [send, sessionId, videoId],
  );

  useEffect(() => {
    let disposed = false;
    void loadYouTube().then((YT) => {
      if (disposed || !host.current) return;
      player.current = new YT.Player(host.current, {
        videoId,
        host: "https://www.youtube-nocookie.com",
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1, controls: audioOnly ? 0 : 1 },
        events: {
          onReady: () => {
            setReady(true);
            setDur(player.current?.getDuration() ?? 0);
            send("watch.join", { session: sessionId });
          },
          onStateChange: (e: { data: number }) => {
            if (e.data === YT.PlayerState.ENDED) onEnded?.();
            if (applying.current) return;
            if (e.data === YT.PlayerState.PLAYING) {
              setPlaying(true);
              broadcast(true);
            } else if (e.data === YT.PlayerState.PAUSED) {
              setPlaying(false);
              broadcast(false);
            }
          },
        },
      });
    });
    return () => {
      disposed = true;
      player.current?.destroy();
      player.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  useEffect(() => {
    const t = setInterval(
      () => {
        const pl = player.current;
        if (!pl) return;
        setPos(pl.getCurrentTime());
        if (leader && playing) broadcast(true);
      },
      leader ? 4000 : 1000,
    );
    const u = setInterval(() => player.current && setPos(player.current.getCurrentTime()), 1000);
    return () => {
      clearInterval(t);
      clearInterval(u);
    };
  }, [leader, playing, broadcast]);

  useCoupleEvent("watch.join", (p) => {
    if (p.session !== sessionId) return;
    setPartnerHere(true);
    send("watch.here", { session: sessionId });
    if (leader && player.current) broadcast(playing);
  });
  useCoupleEvent("watch.here", (p) => p.session === sessionId && setPartnerHere(true));
  useCoupleEvent("watch.state", (p) => {
    if (p.session !== sessionId) return;
    setPartnerHere(true);
    const pl = player.current;
    if (!pl) return;
    const target = expectedPosition(
      { playing: Boolean(p.playing), position: Number(p.position), sentAt: Number(p.sentAt) },
      Date.now(),
    );
    const d = Math.abs(pl.getCurrentTime() - target);
    setDrift(d);
    applying.current = true;
    if (d > DRIFT_LIMIT) pl.seekTo(target, true);
    if (p.playing) pl.playVideo();
    else pl.pauseVideo();
    setPlaying(Boolean(p.playing));
    setTimeout(() => (applying.current = false), 600);
  });
  useCoupleEvent("watch.react", (p) => {
    if (p.session !== sessionId) return;
    float(String(p.e));
  });

  function float(e: string) {
    const id = Math.random();
    setFloats((f) => [...f, { id, e, x: 15 + Math.round(Math.random() * 60) }]);
    setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 1600);
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className={`rounded-thumb border-line relative w-full flex-none border ${audioOnly ? "aspect-[16/6]" : "aspect-[16/10]"} stripe-dim`}
      >
        <div className="rounded-thumb absolute inset-0 overflow-hidden">
          <div ref={host} className="h-full w-full" />
        </div>
        {!ready && (
          <div className="mono text-faint absolute inset-0 flex items-center justify-center text-xs">
            LOADING PLAYER
          </div>
        )}
        {partnerHere && (
          <div className="mono bg-app text-accent absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs">
            <span className="bg-accent h-1.5 w-1.5 rounded-full" aria-hidden />
            SYNCED{drift !== null ? ` · ${drift.toFixed(1)} S` : ""}
          </div>
        )}
        {partnerHere && !audioOnly && (
          <div className="absolute right-2.5 -bottom-[26px] z-[1]">
            <Avatar
              name={partner.name}
              side="partner"
              size={72}
              photoUrl={partner.avatarUrl}
              icon={partner.avatarIcon}
            />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          {floats.map((f) => (
            <span
              key={f.id}
              className="an-float absolute bottom-2.5 text-[28px]"
              style={{ left: `${f.x}%` }}
            >
              {f.e}
            </span>
          ))}
        </div>
      </div>
      {!partnerHere && (
        <div className="rounded-card border-line bg-s1 flex flex-col gap-1 border p-4">
          <div className="text-base font-medium">Waiting on {partner.name}. No rush.</div>
          <div className="text-muted text-sm">
            They&apos;ve had a nudge. You&apos;ll both start from the same second.
          </div>
        </div>
      )}
      <div className="mt-2 flex items-center gap-3">
        <IconButton
          label={playing ? "Pause" : "Play"}
          tone="accent"
          dim={48}
          onClick={() => {
            const pl = player.current;
            if (!pl) return toast("The player is still loading.");
            if (playing) pl.pauseVideo();
            else pl.playVideo();
          }}
        >
          {playing ? <Pause size={22} weight="fill" /> : <Play size={22} weight="fill" />}
        </IconButton>
        <input
          type="range"
          aria-label="Seek"
          min={0}
          max={Math.max(1, dur)}
          value={pos}
          onChange={(e) => {
            const v = Number(e.target.value);
            player.current?.seekTo(v, true);
            setPos(v);
            setTimeout(() => broadcast(playing), 200);
          }}
          className="h-11 flex-1 accent-[var(--text)]"
        />
        <span className="mono text-muted text-xs">
          {fmt(pos)} / {fmt(dur)}
        </span>
      </div>
      <div className="flex gap-2">
        {REACTIONS.map((e) => (
          <button
            key={e}
            type="button"
            aria-label={`React ${e}`}
            onClick={() => {
              float(e);
              send("watch.react", { session: sessionId, e });
            }}
            className="press border-line bg-s1 flex h-[52px] w-[52px] cursor-pointer items-center justify-center rounded-full border text-[22px]"
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

export function WatchRoom({
  session,
}: {
  session: { id: string; video_id: string; title: string | null; created_by: string };
}) {
  const router = useRouter();
  const { me, partner } = useCouple();
  const [lines, setLines] = useState<Array<{ who: "me" | "them"; text: string }>>([]);
  const [text, setText] = useState("");
  useCoupleEvent(
    "watch.chat",
    (p) =>
      p.session === session.id &&
      setLines((l) => [...l.slice(-3), { who: "them", text: String(p.text).slice(0, 200) }]),
  );
  const { send } = useCouple();
  return (
    <div className="an-screen mx-auto flex min-h-dvh w-full max-w-[960px] flex-col gap-4 px-4 pt-[calc(env(safe-area-inset-top)+8px)] pb-8 md:px-8 md:pt-8">
      <div className="flex items-center gap-3">
        <IconButton label="Back" onClick={() => router.push("/plans")}>
          <ArrowLeft size={20} />
        </IconButton>
        <div className="min-w-0 flex-1">
          <div className="display text-[22px] tracking-normal">Watch party</div>
          {session.title && <div className="text-muted truncate text-sm">{session.title}</div>}
        </div>
      </div>
      <SyncedPlayer
        sessionId={session.id}
        videoId={session.video_id}
        leader={session.created_by === me.id}
      />
      <div className="flex flex-col gap-1.5 text-sm" aria-live="polite">
        {lines.map((l, i) => (
          <div key={i}>
            <span
              className="font-bold"
              style={{ color: l.who === "me" ? "var(--partner-a)" : "var(--partner-b)" }}
            >
              {l.who === "me" ? "You" : partner.name}
            </span>{" "}
            {l.text}
          </div>
        ))}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          send("watch.chat", { session: session.id, text: text.trim() });
          setLines((l) => [...l.slice(-3), { who: "me", text: text.trim() }]);
          setText("");
        }}
      >
        <input
          aria-label="Say something"
          placeholder="Say something, it's not a cinema"
          value={text}
          maxLength={200}
          onChange={(e) => setText(e.target.value)}
          className="rounded-input border-line bg-s2 text-text focus:border-accent h-11 min-w-0 flex-1 border px-3.5 text-base outline-none"
        />
      </form>
    </div>
  );
}

"use client";
import { feedback, haptic } from "@/lib/feedback";
import { BrandLogo } from "@/components/clink/brand-logo";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Phone,
  VideoCamera,
  Plus,
  Sticker,
  Microphone,
  PaperPlaneRight,
  X,
  Coffee,
  Wine,
  ArrowBendUpLeft,
  Copy,
  Trash,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useCouple, useCoupleNow, useCoupleEvent } from "@/features/couple/context";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/avatar";
import { IconButton, Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import { cn } from "@/components/ui/cn";
import { formatClock } from "@/lib/time";
import { compressImage } from "@/lib/media/compress";
import { prepareVideo } from "@/lib/media/video";
import { uploadMedia } from "@/lib/media/upload";
import {
  VoiceRecorder,
  RecorderError,
  RECORDER_MESSAGES,
  type Recording,
} from "@/lib/media/recorder";
import { MAX_PER_SEND } from "@/lib/media-rules";
import { useMessages, useReactions, useMediaInfo, useOutboxFlush, sendQueued } from "./use-chat";
import { useQueue, newClientId, type QueuedPayload } from "./queue";
import { Bubble, STICKER_LABEL } from "./bubbles";
import type { Message, UiMessage } from "./types";

const REACTIONS = ["❤️", "😂", "😭", "🔥", "🥹", "👀"];

function dayLabel(d: Date, tz: string) {
  const fmt = (x: Date) =>
    new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(x);
  const today = fmt(new Date());
  const yest = fmt(new Date(Date.now() - 86400000));
  const day = fmt(d);
  const prefix =
    day === today
      ? "Today"
      : day === yest
        ? "Yesterday"
        : new Intl.DateTimeFormat("en-GB", {
            timeZone: tz,
            weekday: "short",
            day: "numeric",
            month: "short",
          }).format(d);
  return `${prefix} ${formatClock(d, tz)}`;
}

export function ChatScreen() {
  const { me, partner, presence, coupleId, send, discreet } = useCouple();
  const now = useCoupleNow(30_000);
  const params = useSearchParams();
  const { messages, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, upsertLocal } =
    useMessages();
  const reactions = useReactions();
  const queue = useQueue();
  const [text, setText] = useState("");
  const [tray, setTray] = useState(false);
  const [replyTo, setReplyTo] = useState<UiMessage | null>(null);
  const [actionFor, setActionFor] = useState<UiMessage | null>(null);
  const [typing, setTyping] = useState(false);
  const [callSheet, setCallSheet] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const [pendingMedia, setPendingMedia] = useState<Record<string, UiMessage>>({});
  const [blurred, setBlurred] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recorder = useRef<VoiceRecorder | null>(null);
  const [holding, setHolding] = useState(false);
  const fingerDown = useRef(false);
  const heldSince = useRef(0);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSent = useRef(0);
  const stickToBottom = useRef(true);

  const { data: stickers } = useQuery({
    queryKey: ["stickers"],
    staleTime: Infinity,
    queryFn: async () => {
      const sb = supabaseBrowser();
      const [{ data: all }, { data: recent }] = await Promise.all([
        sb.from("stickers").select("id, label, sort").order("sort"),
        sb
          .from("sticker_recents")
          .select("sticker_id, used_at")
          .order("used_at", { ascending: false })
          .limit(8),
      ]);
      (all ?? []).forEach((s) => STICKER_LABEL.set(s.id, s.label));
      return { all: all ?? [], recent: (recent ?? []).map((r) => r.sticker_id) };
    },
  });

  const onSent = useCallback((m: Message) => upsertLocal(m), [upsertLocal]);
  const flush = useOutboxFlush(onSent, presence.online);

  // Merge server messages with queued (offline or in-flight) ones.
  const all: UiMessage[] = useMemo(() => {
    const ids = new Set(messages.map((m) => m.client_id));
    const queued: UiMessage[] = queue.items
      .filter((q) => !ids.has(q.clientId))
      .map((q) => ({
        id: `local-${q.clientId}`,
        couple_id: coupleId,
        sender_id: me.id,
        client_id: q.clientId,
        type: q.type,
        body: q.body ?? null,
        reply_to: q.replyTo ?? null,
        media_ids: q.mediaIds ?? [],
        sticker_id: q.stickerId ?? null,
        sent_at: q.createdAt,
        delivered_at: null,
        read_at: null,
        removed_at: null,
        local: queue.failed[q.clientId] ? "failed" : "sending",
      }));
    const media = Object.values(pendingMedia).filter((p) => !ids.has(p.client_id));
    return [...messages, ...queued, ...media].sort((a, b) => a.sent_at.localeCompare(b.sent_at));
  }, [messages, queue.items, queue.failed, pendingMedia, coupleId, me.id]);

  const byId = useMemo(() => new Map(all.map((m) => [m.id, m])), [all]);
  const mediaIds = useMemo(() => all.flatMap((m) => m.media_ids), [all]);
  const { data: mediaInfo = new Map() } = useMediaInfo(mediaIds);

  // Typing indicator over the couple channel.
  useCoupleEvent("chat.typing", (p) => {
    setTyping(Boolean(p.typing));
    if (typingTimer.current) clearTimeout(typingTimer.current);
    if (p.typing) typingTimer.current = setTimeout(() => setTyping(false), 4000);
  });

  // Read receipts: mark partner messages read while the chat is visible.
  useEffect(() => {
    const unread = messages.filter((m) => m.sender_id === partner.id && !m.read_at);
    if (!unread.length || document.visibilityState !== "visible") return;
    supabaseBrowser()
      .from("messages")
      .update({ read_at: new Date().toISOString(), delivered_at: new Date().toISOString() })
      .in(
        "id",
        unread.map((m) => m.id),
      )
      .then(() => undefined);
  }, [messages, partner.id]);

  // CHAT-07 discreet mode: blur the conversation when the app loses focus.
  useEffect(() => {
    if (!discreet) return;
    const hide = () => setBlurred(true);
    const vis = () => document.visibilityState === "hidden" && setBlurred(true);
    window.addEventListener("blur", hide);
    document.addEventListener("visibilitychange", vis);
    return () => {
      window.removeEventListener("blur", hide);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [discreet]);

  // Keep pinned to the newest message unless the reader scrolled up.
  useLayoutEffect(() => {
    const el = listRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [all.length, typing]);

  useEffect(() => {
    if (params.get("voice") === "1") toast("Hold the mic to record a voice note.");
  }, [params]);

  function onScroll() {
    const el = listRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (el.scrollTop < 120 && hasNextPage && !isFetchingNextPage) {
      const before = el.scrollHeight;
      void fetchNextPage().then(() =>
        requestAnimationFrame(() => (el.scrollTop = el.scrollHeight - before + el.scrollTop)),
      );
    }
  }

  async function enqueue(p: Omit<QueuedPayload, "clientId" | "createdAt">) {
    const item: QueuedPayload = {
      ...p,
      clientId: newClientId(),
      createdAt: new Date().toISOString(),
    };
    if (replyTo) item.replyTo = replyTo.id.startsWith("local-") ? undefined : replyTo.id;
    setReplyTo(null);
    stickToBottom.current = true;
    queue.add(item);
    const m = await sendQueued(item, presence.online);
    if (m) upsertLocal(m);
  }

  function onType(v: string) {
    setText(v);
    const now = Date.now();
    if (now - lastTypingSent.current > 2000 && v) {
      lastTypingSent.current = now;
      send("chat.typing", { typing: true });
    }
  }

  async function sendText() {
    const body = text.trim();
    if (!body) return;
    setText("");
    feedback("tap", "send");
    send("chat.typing", { typing: false });
    await enqueue({ type: "text", body });
  }

  async function sendSticker(id: string) {
    setTray(false);
    await enqueue({ type: "sticker", stickerId: id });
  }

  async function sendFiles(files: FileList) {
    const list = Array.from(files).slice(0, MAX_PER_SEND);
    if (files.length > MAX_PER_SEND)
      toast(`Up to ${MAX_PER_SEND} at a time. Sending the first ${MAX_PER_SEND}.`);
    const clientId = newClientId();
    const local: UiMessage = {
      id: `local-${clientId}`,
      couple_id: coupleId,
      sender_id: me.id,
      client_id: clientId,
      type: "media",
      body: null,
      reply_to: replyTo?.id ?? null,
      media_ids: [],
      sticker_id: null,
      sent_at: new Date().toISOString(),
      delivered_at: null,
      read_at: null,
      removed_at: null,
      local: "sending",
      localMedia: list.map((f) => ({
        url: URL.createObjectURL(f),
        kind: f.type.startsWith("video") ? "video" : "image",
        progress: 0,
      })),
    };
    const reply = replyTo?.id;
    setReplyTo(null);
    stickToBottom.current = true;
    setPendingMedia((p) => ({ ...p, [clientId]: local }));
    const setProgress = (i: number, v: number) =>
      setPendingMedia((p) => {
        const cur = p[clientId];
        if (!cur?.localMedia) return p;
        const lm = cur.localMedia.map((x, j) => (j === i ? { ...x, progress: v } : x));
        return { ...p, [clientId]: { ...cur, localMedia: lm } };
      });
    try {
      const ids: string[] = [];
      for (const [i, f] of list.entries()) {
        if (f.type.startsWith("video")) {
          const v = await prepareVideo(f, (p) => setProgress(i, p * 0.5));
          const r = await uploadMedia(
            v.blob,
            { kind: "video", durationS: v.durationS, width: v.width, height: v.height },
            (p) => setProgress(i, 0.5 + p * 0.5),
          );
          ids.push(r.id);
        } else {
          const img = await compressImage(f);
          const r = await uploadMedia(
            img.blob,
            { kind: "image", width: img.width, height: img.height },
            (p) => setProgress(i, p),
          );
          ids.push(r.id);
        }
      }
      const m = await sendQueued(
        { clientId, type: "media", mediaIds: ids, replyTo: reply, createdAt: local.sent_at },
        presence.online,
      );
      if (m) upsertLocal(m);
      setPendingMedia((p) => {
        const n = { ...p };
        delete n[clientId];
        return n;
      });
    } catch (e) {
      toast.err(e instanceof Error ? e.message : "That didn't send.");
      setPendingMedia((p) => ({ ...p, [clientId]: { ...local, local: "failed" } }));
    }
  }

  async function startRecording() {
    try {
      const r = new VoiceRecorder();
      r.onAutoStop = () => void stopRecording(true);
      await r.start();
      recorder.current = r;
      setRecording(true);
      setRecSecs(0);
      haptic("select");
    } catch (e) {
      toast.err(
        e instanceof RecorderError
          ? RECORDER_MESSAGES[e.problem]
          : "Clink needs your microphone for voice notes.",
      );
    }
  }

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setRecSecs(Math.floor(recorder.current?.elapsed() ?? 0)), 250);
    return () => clearInterval(t);
  }, [recording]);

  async function stopRecording(sendIt: boolean) {
    const r = recorder.current;
    recorder.current = null;
    setRecording(false);
    if (!r) return;
    if (!sendIt) {
      r.cancel();
      return;
    }
    const rec: Recording | null = await r.stop();
    if (!rec) return toast("Hold a little longer to record.");
    try {
      const up = await uploadMedia(rec.blob, {
        kind: "audio",
        durationS: rec.durationS,
        waveform: rec.waveform,
      });
      await enqueue({ type: "voice", mediaIds: [up.id] });
    } catch (e) {
      toast.err(e instanceof Error ? e.message : "That voice note didn't send.");
    }
  }

  async function react(m: UiMessage, emoji: string) {
    setActionFor(null);
    const mine = reactions.get(m.id)?.find((r) => r.user_id === me.id);
    const sb = supabaseBrowser();
    if (mine?.emoji === emoji) await sb.from("reactions").delete().eq("id", mine.id);
    else
      await sb
        .from("reactions")
        .upsert(
          { message_id: m.id, couple_id: coupleId, user_id: me.id, emoji, voice_media_id: null },
          { onConflict: "message_id,user_id" },
        );
  }

  async function voiceReaction(m: UiMessage) {
    setActionFor(null);
    const r = new VoiceRecorder();
    try {
      await r.start();
    } catch {
      return toast("Clink needs your microphone for that.");
    }
    toast("Recording a 5 second voice reaction.");
    setTimeout(async () => {
      const rec = await r.stop();
      if (!rec) return;
      const up = await uploadMedia(rec.blob, {
        kind: "audio",
        durationS: rec.durationS,
        waveform: rec.waveform,
      });
      await supabaseBrowser().from("reactions").upsert(
        {
          message_id: m.id,
          couple_id: coupleId,
          user_id: me.id,
          emoji: null,
          voice_media_id: up.id,
        },
        { onConflict: "message_id,user_id" },
      );
      toast("Voice reaction sent.");
    }, 5000);
  }

  async function unsend(m: UiMessage) {
    setActionFor(null);
    await supabaseBrowser()
      .from("messages")
      .update({ removed_at: new Date().toISOString() })
      .eq("id", m.id);
    await Promise.all(m.media_ids.map((id) => fetch(`/api/media/${id}`, { method: "DELETE" })));
  }

  const lastMine = [...all]
    .reverse()
    .find((m) => m.sender_id === me.id && !m.local && m.type !== "clink");
  const sub = presence.online
    ? `Online, ${formatClock(now, partner.timezone)} in ${partner.city}`
    : `Away, ${formatClock(now, partner.timezone)} in ${partner.city}`;
  const digits = partner.phone?.replace(/[^\d+]/g, "") ?? "";

  return (
    <div className="an-screen flex h-[calc(100dvh-var(--chrome-bottom))] flex-col lg:flex-row">
      <section
        className="flex min-h-0 min-w-0 flex-1 flex-col"
        aria-label={`Chat with ${partner.name}`}
      >
        <header className="border-line flex flex-none items-center gap-3 border-b px-4 pt-[calc(env(safe-area-inset-top)+8px)] pb-3">
          <Avatar
            name={partner.name}
            side="partner"
            size={44}
            photoUrl={partner.avatarUrl}
            icon={partner.avatarIcon}
            dim={!presence.online}
          />
          <div className="min-w-0 flex-1">
            <h1 className="m-0 text-lg font-bold">{partner.name}</h1>
            <div className="text-muted truncate text-[13px]">{sub}</div>
          </div>
          <IconButton label="Call" tone="surface" onClick={() => setCallSheet(true)}>
            <Phone size={20} />
          </IconButton>
          <IconButton label="Video call" tone="surface" onClick={() => setCallSheet(true)}>
            <VideoCamera size={20} />
          </IconButton>
        </header>

        <div
          ref={listRef}
          onScroll={onScroll}
          className="no-scrollbar relative flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-4"
          style={{ filter: blurred ? "blur(14px)" : undefined }}
          onClick={() => blurred && setBlurred(false)}
          aria-live="polite"
        >
          {isFetchingNextPage && <div className="an-skel bg-s2 mx-auto h-4 w-24 rounded-full" />}
          {isLoading ? (
            <div role="status" className="flex flex-col gap-2.5" aria-label="Loading messages">
              {[
                ["flex-start", "62%", 44],
                ["flex-end", "48%", 44],
                ["flex-start", "70%", 150],
                ["flex-end", "78%", 56],
                ["flex-start", "55%", 44],
                ["flex-end", "40%", 44],
              ].map(([side, w, h], i) => (
                <div
                  key={i}
                  className="an-skel rounded-card bg-s2"
                  style={{
                    alignSelf: side as string,
                    width: w as string,
                    height: h as number,
                    animationDelay: `${i * 90}ms`,
                  }}
                />
              ))}
            </div>
          ) : all.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
              <div className="flex flex-col items-center" aria-hidden>
                <div className="flex gap-7">
                  <Coffee size={44} className="text-text" />
                  <Coffee size={44} className="text-accent" style={{ transform: "scaleX(-1)" }} />
                </div>
                <div className="bg-line mt-0.5 h-0.5 w-40 rounded-sm" />
              </div>
              <div className="display text-[28px] leading-[1.05]">
                Say something.
                <br />
                Or just send a <em>Clink</em>.
              </div>
              <Link
                href="/us"
                className="press border-line bg-s2 text-text hover:text-text flex h-11 items-center gap-1.5 rounded-full border px-[18px] text-sm font-medium"
              >
                <Wine size={18} aria-hidden />
                Send a Clink
              </Link>
            </div>
          ) : (
            all.map((m, i) => {
              const prev = all[i - 1];
              const next = all[i + 1];
              const gap =
                !prev ||
                new Date(m.sent_at).getTime() - new Date(prev.sent_at).getTime() > 30 * 60 * 1000;
              // Runs from the same person within 2 minutes read as one block.
              const joins = (x?: (typeof all)[number], y?: (typeof all)[number]) =>
                Boolean(
                  x &&
                  y &&
                  x.sender_id === y.sender_id &&
                  x.type !== "clink" &&
                  y.type !== "clink" &&
                  Math.abs(new Date(y.sent_at).getTime() - new Date(x.sent_at).getTime()) <
                    2 * 60 * 1000,
                );
              const withPrev = !gap && joins(prev, m);
              const withNext = joins(m, next) && !(lastMine?.id === m.id);
              const pos = withPrev ? (withNext ? "middle" : "last") : withNext ? "first" : "single";
              return (
                <div key={m.id} className="contents">
                  {gap && (
                    <div className="mono text-faint self-center py-1 text-xs">
                      {dayLabel(new Date(m.sent_at), me.timezone)}
                    </div>
                  )}
                  <Bubble
                    pos={pos}
                    m={m}
                    mine={m.sender_id === me.id}
                    partnerName={partner.name}
                    media={mediaInfo}
                    reactions={reactions.get(m.id) ?? []}
                    replyTarget={m.reply_to ? byId.get(m.reply_to) : undefined}
                    onLongPress={(x) => !x.local && setActionFor(x)}
                    onSwipeReply={(x) => !x.local && setReplyTo(x)}
                    onRetry={() => void flush()}
                  />
                  {lastMine?.id === m.id && (
                    <div className="mono text-faint self-end text-xs">
                      {m.read_at
                        ? `Read ${formatClock(new Date(m.read_at), me.timezone)}`
                        : m.delivered_at
                          ? "Delivered"
                          : "Sent"}
                    </div>
                  )}
                </div>
              );
            })
          )}
          {typing && (
            <div
              role="status"
              className="border-line bg-s1 flex gap-1 self-start rounded-[20px_20px_20px_6px] border px-4 py-3.5"
              aria-label={`${partner.name} is typing`}
            >
              {[0, 0.2, 0.4].map((d) => (
                <span
                  key={d}
                  className="an-typing bg-muted h-[7px] w-[7px] rounded-full"
                  style={{ animationDelay: `${d}s` }}
                />
              ))}
            </div>
          )}
          {blurred && (
            <div
              className="bg-s3 sticky bottom-1/2 self-center rounded-full px-4 py-2 text-sm font-medium"
              style={{ filter: "none" }}
            >
              Tap to show the chat
            </div>
          )}
        </div>

        {tray && (
          <div className="an-sheet border-line bg-s1 flex-none border-t px-4 py-3">
            <div className="mono text-faint mb-2.5 text-xs">
              {stickers?.recent.length ? "RECENT · CLINK STARTER PACK" : "CLINK STARTER PACK"}
            </div>
            <div className="no-scrollbar grid max-h-[230px] grid-cols-4 gap-2.5 overflow-y-auto sm:grid-cols-6 lg:grid-cols-8">
              {[
                ...(stickers?.recent ?? []),
                ...(stickers?.all.map((s) => s.id).filter((id) => !stickers.recent.includes(id)) ??
                  []),
              ].map((id, i) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => sendSticker(id)}
                  aria-label={`Send sticker ${STICKER_LABEL.get(id)}`}
                  className="press display border-line bg-s2 text-text aspect-square cursor-pointer rounded-full border text-[15px] tracking-normal"
                  style={{ transform: `rotate(${i % 2 ? 6 : -6}deg)` }}
                >
                  {STICKER_LABEL.get(id)}
                </button>
              ))}
            </div>
          </div>
        )}

        {replyTo && (
          <div className="border-line bg-s1 flex flex-none items-center gap-2 border-t px-4 py-2 text-sm">
            <ArrowBendUpLeft size={16} className="text-accent" aria-hidden />
            <span className="text-muted flex-1 truncate">
              Replying to {replyTo.sender_id === me.id ? "yourself" : partner.name}:{" "}
              {replyTo.body ?? replyTo.type}
            </span>
            <IconButton label="Cancel reply" dim={36} onClick={() => setReplyTo(null)}>
              <X size={16} />
            </IconButton>
          </div>
        )}

        <form
          className="flex flex-none items-center gap-2 px-3 py-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            void sendText();
          }}
        >
          {recording ? (
            <>
              <IconButton
                label="Cancel recording"
                tone="surface"
                onClick={() => stopRecording(false)}
              >
                <X size={20} />
              </IconButton>
              <div
                className="rounded-input border-accent bg-s2 flex h-11 flex-1 items-center gap-2.5 border px-3.5"
                role="status"
              >
                <span className="an-dot bg-accent h-2.5 w-2.5 rounded-full" aria-hidden />
                <span className="mono text-sm">
                  {Math.floor(recSecs / 60)}:{String(recSecs % 60).padStart(2, "0")}
                </span>
                <span className="text-muted truncate text-sm">
                  {holding ? "Release to send" : "Tap send when you're done"}
                </span>
              </div>
              <IconButton label="Send voice note" tone="accent" onClick={() => stopRecording(true)}>
                <PaperPlaneRight size={20} weight="fill" />
              </IconButton>
            </>
          ) : (
            <>
              <IconButton
                label="Add photos or videos"
                tone="outline"
                className="bg-s2"
                onClick={() => fileRef.current?.click()}
              >
                <Plus size={20} />
              </IconButton>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,video/*"
                multiple
                hidden
                onChange={(e) => e.target.files?.length && sendFiles(e.target.files)}
              />
              <div className="rounded-input border-line bg-s2 focus-within:border-accent flex h-11 min-w-0 flex-1 items-center gap-1.5 border pr-1.5 pl-3.5">
                <input
                  aria-label={`Message ${partner.name}`}
                  placeholder={`Message ${partner.name}`}
                  value={text}
                  maxLength={4000}
                  onChange={(e) => onType(e.target.value)}
                  className="text-text min-w-0 flex-1 bg-transparent text-base outline-none focus-visible:shadow-none"
                />
                <button
                  type="button"
                  onClick={() => setTray(!tray)}
                  aria-label="Stickers"
                  aria-expanded={tray}
                  className={cn(
                    "flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent",
                    tray ? "text-accent" : "text-muted",
                  )}
                >
                  <Sticker size={22} />
                </button>
              </div>
              {text.trim() ? (
                <IconButton label="Send" tone="accent" type="submit">
                  <PaperPlaneRight size={20} weight="fill" />
                </IconButton>
              ) : (
                <IconButton
                  label="Hold to record a voice note"
                  tone="accent"
                  onContextMenu={(e) => e.preventDefault()}
                  style={{ touchAction: "none", WebkitTouchCallout: "none", userSelect: "none" }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    // Hold to record: if the finger is still down once recording starts,
                    // lifting it sends. A quick tap (or a permission prompt) leaves it
                    // recording until you press send. Capturing the pointer keeps the
                    // release on this button even if the finger drifts or the page scrolls.
                    try {
                      e.currentTarget.setPointerCapture(e.pointerId);
                    } catch {
                      /* not all browsers allow capture here */
                    }
                    fingerDown.current = true;
                    const done = (ev: PointerEvent) => {
                      window.removeEventListener("pointerup", done);
                      window.removeEventListener("pointercancel", done);
                      fingerDown.current = false;
                      // A cancelled touch (long-press, scroll) keeps recording; only a real
                      // release after a proper hold sends.
                      if (
                        ev.type === "pointerup" &&
                        recorder.current &&
                        heldSince.current &&
                        Date.now() - heldSince.current > 400
                      )
                        void stopRecording(true);
                      heldSince.current = 0;
                      setHolding(false);
                    };
                    window.addEventListener("pointerup", done);
                    window.addEventListener("pointercancel", done);
                    void startRecording().then(() => {
                      if (fingerDown.current) {
                        heldSince.current = Date.now();
                        setHolding(true);
                      }
                    });
                  }}
                  onKeyDown={(e) =>
                    (e.key === "Enter" || e.key === " ") && !recording && startRecording()
                  }
                >
                  <Microphone size={20} />
                </IconButton>
              )}
            </>
          )}
        </form>
      </section>

      {/* Desktop second panel: what you've shared lately. */}
      <SharedPanel />

      <Sheet
        open={Boolean(actionFor)}
        onOpenChange={(v) => !v && setActionFor(null)}
        title="Message actions"
        handle
      >
        {actionFor && (
          <>
            <div className="flex justify-between gap-2" role="group" aria-label="React">
              {REACTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => react(actionFor, e)}
                  aria-label={`React ${e}`}
                  className="press border-line bg-s2 flex h-[52px] w-[52px] cursor-pointer items-center justify-center rounded-full border text-[22px]"
                >
                  {e}
                </button>
              ))}
            </div>
            <div className="rounded-card border-line bg-s2 overflow-hidden border">
              <SheetAction
                icon={<Microphone size={20} />}
                label="Voice reaction (5 s)"
                onClick={() => voiceReaction(actionFor)}
              />
              <SheetAction
                icon={<ArrowBendUpLeft size={20} />}
                label="Reply"
                onClick={() => {
                  setReplyTo(actionFor);
                  setActionFor(null);
                }}
              />
              {actionFor.body && (
                <SheetAction
                  icon={<Copy size={20} />}
                  label="Copy"
                  onClick={async () => {
                    await navigator.clipboard.writeText(actionFor.body ?? "");
                    setActionFor(null);
                    toast("Copied.");
                  }}
                />
              )}
              {actionFor.sender_id === me.id && !actionFor.removed_at && (
                <SheetAction
                  icon={<Trash size={20} />}
                  label="Unsend"
                  danger
                  onClick={() => unsend(actionFor)}
                  last
                />
              )}
            </div>
          </>
        )}
      </Sheet>

      <Sheet open={callSheet} onOpenChange={setCallSheet} title={`Call ${partner.name}`} handle>
        <div className="display text-[28px]">Call {partner.name}</div>
        {digits ? (
          <div className="flex flex-col gap-2">
            <a
              href={`https://wa.me/${digits.replace("+", "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="press bg-accent text-on-accent hover:text-on-accent flex h-[52px] items-center justify-center gap-2 rounded-full font-bold"
            >
              <BrandLogo brand="whatsapp" size={26} /> WhatsApp
            </a>
            <a
              href={`facetime:${digits}`}
              className="press border-line bg-s2 text-text hover:text-text flex h-[52px] items-center justify-center gap-2 rounded-full border font-medium"
            >
              FaceTime
            </a>
            <a
              href={`tel:${digits}`}
              className="press border-line text-text hover:text-text flex h-[52px] items-center justify-center gap-2 rounded-full border bg-transparent font-medium"
            >
              <Phone size={20} aria-hidden /> Phone
            </a>
          </div>
        ) : (
          <>
            <p className="text-muted m-0 text-base">
              {partner.name} hasn&apos;t saved a number yet. They can add one in Settings, under
              Profile.
            </p>
            <Button variant="secondary" size="lg" onClick={() => setCallSheet(false)}>
              Okay
            </Button>
          </>
        )}
      </Sheet>
    </div>
  );
}

function SheetAction({
  icon,
  label,
  onClick,
  danger,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-14 w-full cursor-pointer items-center gap-3 bg-transparent px-4 text-left text-base font-medium",
        danger ? "text-danger" : "text-text",
        !last && "border-line border-b",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function SharedPanel() {
  const { coupleId } = useCouple();
  const { data } = useQuery({
    queryKey: ["shared-media", coupleId],
    queryFn: async () => {
      const { data } = await supabaseBrowser()
        .from("media")
        .select("id, kind")
        .eq("status", "ready")
        .in("kind", ["image", "video"])
        .not("storage_path", "like", "avatars/%")
        .order("created_at", { ascending: false })
        .limit(12);
      return data ?? [];
    },
  });
  return (
    <aside
      className="border-line hidden w-[320px] flex-none flex-col gap-3 overflow-y-auto border-l p-5 xl:flex"
      aria-label="Shared lately"
    >
      <h2 className="m-0 text-lg font-bold">Shared lately</h2>
      {data && data.length ? (
        <div className="grid grid-cols-3 gap-1.5">
          {data.map((m) => (
            <Link
              key={m.id}
              href={`/chat/media/${m.id}`}
              className="stripe rounded-thumb block aspect-square overflow-hidden"
              aria-label="Open shared media"
            >
              {m.kind === "video" ? (
                <video
                  src={`/api/media/${m.id}/view`}
                  muted
                  preload="metadata"
                  className="h-full w-full object-cover"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/media/${m.id}/view`}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              )}
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-muted m-0 text-sm">
          Photos and videos you send each other show up here.
        </p>
      )}
      <Link href="/keep" className="mt-2 text-sm font-medium">
        Favourites live on the memory wall
      </Link>
    </aside>
  );
}

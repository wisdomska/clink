"use client";
import { feedback, haptic } from "@/lib/feedback";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Phone,
  Camera,
  PencilSimple,
  MagnifyingGlass,
  DotsThreeVertical,
  ImagesSquare,
  UserCircle,
  Palette,
  VideoCamera,
  Plus,
  Check,
  Sticker,
  Microphone,
  PaperPlaneRight,
  X,
  Coffee,
  Pepper,
  Wine,
  ArrowBendUpLeft,
  Copy,
  Archive,
  Trash,
  PushPin,
  PushPinSlash,
  Clock,
} from "@phosphor-icons/react";
import { AddToKeepSheet } from "./add-to-keep";
import Link from "next/link";
import { useCouple, useCoupleNow, useCoupleEvent } from "@/features/couple/context";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/avatar";
import { IconButton, Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { LoadingDots } from "@/components/ui/spinner";
import { Toggle } from "@/components/ui/toggle";
import { toast } from "@/components/ui/toast";
import { cn } from "@/components/ui/cn";
import { countdownParts, formatClock } from "@/lib/time";
import { useSendClink } from "@/features/home/use-send-clink";
import { useWeather } from "@/features/home/dual-clock";
import { useCountdowns, KindIcon } from "@/features/home/countdown-card";
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
import {
  useMessages,
  useReactions,
  useMediaInfo,
  useOutboxFlush,
  useReplyTargets,
  sendQueued,
} from "./use-chat";
import { usePins, PinnedBar, PinsSheet } from "./pins";
import { useScheduled, SendLaterSheet, ScheduledBar, ScheduledSheet } from "./scheduled";
import { usePrefersReducedMotion } from "@/lib/hooks";
import { useQueue, newClientId, type QueuedPayload } from "./queue";
import { Bubble, STICKER_LABEL, previewText } from "./bubbles";
import { StickerArt, STICKER_CAPTION } from "./sticker-art";
import { MediaComposer } from "./media-composer";
import { LiveWave } from "./live-wave";
import { ChatSearch } from "./chat-search";
import {
  CHAT_THEMES,
  WALLPAPERS,
  bubbleVars,
  wallpaperStyle,
  type ChatTheme,
  type Wallpaper,
} from "./themes";
import { LookPicker } from "./wallpapers/look-picker";
import { CameraCapture } from "./camera-capture";
import { useCall } from "@/features/call/call-provider";
import { useOpenPartner } from "@/features/partner/partner-sheet";
import { MissedCallCard } from "@/features/call/missed-call-card";
import type { Message, UiMessage } from "./types";
import { EmojiPicker } from "@/components/ui/emoji-picker";

const REACTIONS = ["❤️", "😂", "🤣", "😭", "😢", "😡", "😒", "🔥", "🥹", "👀"];

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
  const {
    me,
    partner,
    presence,
    coupleId,
    send,
    discreet,
    chatTheme,
    chatWallpaper,
    chatWallpaperMedia,
    chatWallpaperBlur,
    darkBoth,
    linkedAt,
  } = useCouple();
  const [stickerTab, setStickerTab] = useState<"all" | "spicy">("all");
  const [look, setLook] = useState({
    theme: (chatTheme in CHAT_THEMES ? chatTheme : "clink") as ChatTheme,
    wallpaper: (chatWallpaper in WALLPAPERS ? chatWallpaper : "none") as Wallpaper,
    media: chatWallpaperMedia,
    blur: chatWallpaperBlur,
  });
  const wallRef = useRef<HTMLDivElement>(null);
  const wallInput = useRef<HTMLInputElement>(null);
  const [wallBusy, setWallBusy] = useState(false);
  const [lookOpen, setLookOpen] = useState(false);
  useCoupleEvent("chat.look", (p) =>
    setLook((cur) => ({
      theme: (String(p.theme) in CHAT_THEMES ? p.theme : cur.theme) as ChatTheme,
      wallpaper: (String(p.wallpaper) in WALLPAPERS ? p.wallpaper : cur.wallpaper) as Wallpaper,
      media: p.media === undefined ? cur.media : ((p.media as string | null) ?? null),
      blur: p.blur === undefined ? cur.blur : Boolean(p.blur),
    })),
  );
  const saveLook = async (next: typeof look) => {
    setLook(next);
    haptic("select");
    send("chat.look", next);
    await fetch("/api/couple", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_theme: next.theme,
        chat_wallpaper: next.wallpaper,
        chat_wallpaper_media: next.media,
        chat_wallpaper_blur: next.blur,
      }),
    });
  };
  const now = useCoupleNow(30_000);
  const params = useSearchParams();
  const { messages, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, upsertLocal } =
    useMessages();
  const reactions = useReactions();
  const qc = useQueryClient();
  const queue = useQueue();
  const [text, setText] = useState("");
  const [tray, setTray] = useState(false);
  const [composing, setComposing] = useState<File[] | null>(null);
  const [editing, setEditing] = useState<UiMessage | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const router = useRouter();
  const [replyTo, setReplyTo] = useState<UiMessage | null>(null);
  const [actionFor, setActionFor] = useState<UiMessage | null>(null);
  const [keepFor, setKeepFor] = useState<{ ids: string[]; sentAt: string } | null>(null);
  const [typing, setTyping] = useState(false);
  const { start: startCall } = useCall();
  const openPartner = useOpenPartner();
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const [pendingMedia, setPendingMedia] = useState<Record<string, UiMessage>>({});
  const [blurred, setBlurred] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const captureRef = useRef<HTMLInputElement>(null);
  const [camera, setCamera] = useState(false);
  const cameraFallback = useCallback(() => {
    setCamera(false);
    captureRef.current?.click();
  }, []);
  const recorder = useRef<VoiceRecorder | null>(null);
  const micLevel = useCallback(() => recorder.current?.level() ?? 0, []);
  const [holding, setHolding] = useState(false);
  const fingerDown = useRef(false);
  const heldSince = useRef(0);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSent = useRef(0);
  const stickToBottom = useRef(true);
  const reducedMotion = usePrefersReducedMotion();
  const { pins, pinned, pin, unpin } = usePins();
  const [pinsOpen, setPinsOpen] = useState(false);
  /**
   * Scroll to a message and flash it. Older messages load page by page until
   * the original turns up (or the history runs out).
   */
  async function jumpTo(id: string, at?: string) {
    const find = () =>
      listRef.current?.querySelector<HTMLElement>(`[data-mid="${CSS.escape(id)}"]`);
    let el = find();
    let more = hasNextPage;
    for (let tries = 0; !el && more && tries < 25; tries++) {
      const r = await fetchNextPage();
      more = r.hasNextPage;
      await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
      el = find();
    }
    if (!el) {
      toast(
        at
          ? `That one's from ${new Date(at).toLocaleDateString()} and isn't here any more.`
          : "That message isn't here any more.",
      );
      return;
    }
    stickToBottom.current = false;
    el.scrollIntoView({ block: "center", behavior: reducedMotion ? "auto" : "smooth" });
    // After any closing sheet has handed focus back, move it to the message.
    requestAnimationFrame(() =>
      el.querySelector<HTMLElement>('[role="button"]')?.focus({ preventScroll: true }),
    );
    el.classList.add("bg-accent/15");
    setTimeout(() => el.classList.remove("bg-accent/15"), 1600);
  }
  // /chat?m=<id> (from global search) opens on that message.
  const linkedMessage = params.get("m");
  const jumpedTo = useRef<string | null>(null);
  const openLinked = useEffectEvent((id: string) => void jumpTo(id));
  useEffect(() => {
    if (!linkedMessage || isLoading || jumpedTo.current === linkedMessage) return;
    jumpedTo.current = linkedMessage;
    openLinked(linkedMessage);
  }, [linkedMessage, isLoading]);

  const { data: stickers } = useQuery({
    queryKey: ["stickers"],
    staleTime: Infinity,
    queryFn: async () => {
      const sb = supabaseBrowser();
      const [{ data: all }, { data: recent }] = await Promise.all([
        sb
          .from("stickers")
          .select("id, pack, label, sort, caption")
          .eq("enabled", true)
          .order("sort"),
        sb
          .from("sticker_recents")
          .select("sticker_id, used_at")
          .order("used_at", { ascending: false })
          .limit(8),
      ]);
      (all ?? []).forEach((s) => {
        STICKER_LABEL.set(s.id, s.label);
        STICKER_CAPTION.set(s.id, s.caption);
      });
      return {
        all: (all ?? []).filter((x) => x.pack !== "spicy"),
        spicy: (all ?? []).filter((x) => x.pack === "spicy"),
        recent: (recent ?? []).map((r) => r.sticker_id),
      };
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
        edited_at: null,
        local: queue.failed[q.clientId] ? "failed" : "sending",
      }));
    const media = Object.values(pendingMedia).filter((p) => !ids.has(p.client_id));
    return [...messages, ...queued, ...media].sort((a, b) => a.sent_at.localeCompare(b.sent_at));
  }, [messages, queue.items, queue.failed, pendingMedia, coupleId, me.id]);

  const byId = useMemo(() => new Map(all.map((m) => [m.id, m])), [all]);
  const missingReplies = useMemo(
    () => all.map((m) => m.reply_to).filter((id): id is string => Boolean(id) && !byId.has(id!)),
    [all, byId],
  );
  const { data: olderTargets } = useReplyTargets(missingReplies);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  // Grow the composer with its text (up to its max height) where CSS field-sizing isn't supported.
  useLayoutEffect(() => {
    const el = composerRef.current;
    if (!el || CSS.supports?.("field-sizing", "content")) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [text]);
  const myClientIds = useMemo(
    () => new Set(messages.filter((m) => m.sender_id === me.id).map((m) => m.client_id)),
    [messages, me.id],
  );
  const scheduled = useScheduled(myClientIds);
  const [laterOpen, setLaterOpen] = useState(false);
  const [scheduledOpen, setScheduledOpen] = useState(false);
  async function scheduleText(at: Date) {
    const body = text.trim();
    if (!body) return;
    const reply = replyTo && !replyTo.id.startsWith("local-") ? replyTo.id : undefined;
    setLaterOpen(false);
    setText("");
    setReplyTo(null);
    send("chat.typing", { typing: false });
    const ok = await scheduled.schedule(body, at, reply);
    if (!ok) setText((cur) => cur || body);
  }
  const startReply = (m: UiMessage) => {
    setReplyTo(m);
    setEditing(null);
    haptic("select");
    requestAnimationFrame(() => composerRef.current?.focus());
  };
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
    // Subtle parallax: the wallpaper drifts a little as you scroll back in time.
    if (wallRef.current) {
      const fromBottom = el.scrollHeight - el.clientHeight - el.scrollTop;
      wallRef.current.style.transform = `translate3d(0, ${Math.min(48, fromBottom * 0.04)}px, 0)`;
    }
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (el.scrollTop < 120) loadOlder();
  }

  // Older messages: keep your place while the earlier page slots in above.
  const loadingOlder = useRef(false);
  // Where you were before the earlier page arrived; restored once it's on screen.
  const anchor = useRef<{ before: number; top: number } | null>(null);
  function loadOlder() {
    const el = listRef.current;
    if (!el || !hasNextPage || isFetchingNextPage || loadingOlder.current) return;
    loadingOlder.current = true;
    anchor.current = { before: el.scrollHeight, top: el.scrollTop };
    void fetchNextPage().finally(() => {
      loadingOlder.current = false;
      // Nothing new came back (or it failed): drop the anchor so nothing jumps.
      requestAnimationFrame(() => {
        if (anchor.current && listRef.current?.scrollHeight === anchor.current.before)
          anchor.current = null;
      });
    });
  }
  // The top of the list is watched too, so a fast fling (where phones skip
  // scroll events) or a short list that can't scroll still loads more.
  const topRef = useRef<HTMLDivElement>(null);
  const loadOlderEvent = useEffectEvent(loadOlder);
  // Runs after the earlier page is drawn (not just fetched), so your place holds.
  // Still at the top afterwards (tall screens): keep going without a scroll event.
  useLayoutEffect(() => {
    const el = listRef.current;
    const a = anchor.current;
    if (!el || !a || el.scrollHeight === a.before) return;
    anchor.current = null;
    el.scrollTop = el.scrollHeight - a.before + a.top;
    if (el.scrollTop < 120) requestAnimationFrame(() => loadOlderEvent());
  }, [messages.length]);
  useEffect(() => {
    const el = topRef.current;
    const root = listRef.current;
    if (!el || !root) return;
    const io = new IntersectionObserver(
      (entries) => entries.some((e) => e.isIntersecting) && loadOlderEvent(),
      { root, rootMargin: "300px 0px 0px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isLoading]);

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
    if (editing) {
      const target = editing;
      setEditing(null);
      setText("");
      if (body === target.body) return;
      upsertLocal({ ...target, body, edited_at: new Date().toISOString() });
      const r = await fetch(`/api/messages/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!r.ok) {
        upsertLocal(target);
        toast.err((await r.json().catch(() => ({}))).message ?? "That edit didn't save.");
      } else feedback("tap");
      return;
    }
    setText("");
    feedback("tap", "send");
    send("chat.typing", { typing: false });
    await enqueue({ type: "text", body });
  }

  async function sendSticker(id: string) {
    setTray(false);
    await enqueue({ type: "sticker", stickerId: id });
  }

  async function sendFiles(files: File[], caption = "") {
    const list = files.slice(0, MAX_PER_SEND);
    if (files.length > MAX_PER_SEND)
      toast(`Up to ${MAX_PER_SEND} at a time. Sending the first ${MAX_PER_SEND}.`);
    const clientId = newClientId();
    const local: UiMessage = {
      id: `local-${clientId}`,
      couple_id: coupleId,
      sender_id: me.id,
      client_id: clientId,
      type: "media",
      body: caption || null,
      reply_to: replyTo?.id ?? null,
      media_ids: [],
      sticker_id: null,
      sent_at: new Date().toISOString(),
      delivered_at: null,
      read_at: null,
      removed_at: null,
      edited_at: null,
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
        {
          clientId,
          type: "media",
          mediaIds: ids,
          body: caption || undefined,
          replyTo: reply,
          createdAt: local.sent_at,
        },
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
    if (mine?.emoji === emoji) {
      await sb.from("reactions").delete().eq("id", mine.id);
      send("chat.reaction", {});
      void qc.invalidateQueries({ queryKey: ["reactions", coupleId] });
    } else
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
    toast("Recording a 5-second voice reaction.");
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
    .find((m) => m.sender_id === me.id && !m.local && m.type !== "clink" && m.type !== "system");
  const sub = presence.online
    ? `Online, ${formatClock(now, partner.timezone)}${partner.city ? ` in ${partner.city}` : ""}`
    : `Away, ${formatClock(now, partner.timezone)}${partner.city ? ` in ${partner.city}` : ""}`;

  return (
    <div className="an-screen flex h-[calc(100dvh-var(--chrome-bottom))] flex-col lg:flex-row">
      <section
        className="flex min-h-0 min-w-0 flex-1 flex-col"
        aria-label={`Chat with ${partner.name}`}
      >
        <header className="border-line flex flex-none items-center gap-3 border-b px-4 pt-[calc(env(safe-area-inset-top)+8px)] pb-3">
          <button
            type="button"
            onClick={openPartner}
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 border-0 bg-transparent p-0 text-left text-[var(--text)]"
          >
            <Avatar
              name={partner.name}
              side="partner"
              size={44}
              photoUrl={partner.avatarUrl}
              icon={partner.avatarIcon}
              dim={!presence.online}
            />
            <span className="min-w-0 flex-1">
              <span role="heading" aria-level={1} className="block text-lg font-bold">
                {partner.name}
              </span>
              <span className="text-muted block truncate text-[13px]">{sub}</span>
              <span className="sr-only">Open {partner.name}&apos;s profile.</span>
            </span>
          </button>
          <IconButton label="Call" tone="surface" onClick={() => startCall(false)}>
            <Phone size={20} />
          </IconButton>
          <IconButton label="Video call" tone="surface" onClick={() => startCall(true)}>
            <VideoCamera size={20} />
          </IconButton>
          <IconButton label="More" tone="surface" onClick={() => setMoreOpen(true)}>
            <DotsThreeVertical size={22} weight="bold" />
          </IconButton>
        </header>

        <PinnedBar
          pins={pins}
          meId={me.id}
          partnerName={partner.name}
          onJump={(id, at) => void jumpTo(id, at)}
          onOpenList={() => setPinsOpen(true)}
        />
        <div className="flex-none px-4 pt-2 empty:hidden">
          <MissedCallCard />
        </div>
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* The wallpaper stays put behind the messages; it only drifts slightly (parallax). */}
          <div
            ref={wallRef}
            aria-hidden
            data-testid="chat-wallpaper"
            className="pointer-events-none absolute inset-x-0 -top-12 bottom-0 transition-transform duration-300 ease-out will-change-transform"
            style={
              look.wallpaper === "custom" && look.media
                ? {
                    backgroundImage: `url(/api/media/${look.media}/view)`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    filter: look.blur ? "blur(18px) brightness(.7)" : "brightness(.75)",
                    transform: "translate3d(0, 0, 0)",
                    scale: look.blur ? "1.08" : undefined,
                  }
                : {
                    ...wallpaperStyle(look.wallpaper),
                    filter: look.blur && look.wallpaper !== "none" ? "blur(6px)" : undefined,
                  }
            }
          />
          <div
            ref={listRef}
            onScroll={onScroll}
            className="no-scrollbar relative flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-4 xl:px-[max(1rem,calc((100%-880px)/2))]"
            style={
              {
                filter: blurred ? "blur(14px)" : undefined,
                ...bubbleVars(look.theme),
              } as React.CSSProperties
            }
            onClick={() => blurred && setBlurred(false)}
            aria-live="polite"
          >
            <div ref={topRef} aria-hidden className="h-px w-full flex-none" />
            {!isLoading &&
              (isFetchingNextPage ? (
                <div className="an-skel bg-s2 mx-auto h-4 w-24 flex-none rounded-full" />
              ) : hasNextPage ? (
                <button
                  type="button"
                  onClick={loadOlder}
                  className="press text-accent mx-auto flex h-9 flex-none cursor-pointer items-center rounded-full border-0 bg-transparent px-3 text-sm font-semibold"
                >
                  Load earlier messages
                </button>
              ) : (
                <p className="text-faint m-0 flex-none py-2 text-center text-xs">
                  Start of your chat with {partner.name}
                  {linkedAt
                    ? `, linked ${new Date(linkedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`
                    : ""}
                  .
                </p>
              ))}
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
                  Or just send a Clink.
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
                    x.type !== "system" &&
                    y.type !== "clink" &&
                    y.type !== "system" &&
                    Math.abs(new Date(y.sent_at).getTime() - new Date(x.sent_at).getTime()) <
                      2 * 60 * 1000,
                  );
                const withPrev = !gap && joins(prev, m);
                const withNext = joins(m, next) && !(lastMine?.id === m.id);
                const pos = withPrev
                  ? withNext
                    ? "middle"
                    : "last"
                  : withNext
                    ? "first"
                    : "single";
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
                      replyTarget={
                        m.reply_to
                          ? (byId.get(m.reply_to) ?? olderTargets?.get(m.reply_to))
                          : undefined
                      }
                      onJumpTo={(id, at) => void jumpTo(id, at)}
                      pinned={pinned.has(m.id)}
                      onLongPress={(x) => !x.local && setActionFor(x)}
                      onSwipeReply={(x) => !x.local && startReply(x)}
                      meId={me.id}
                      onRemoveReaction={async (r) => {
                        haptic("tap");
                        await supabaseBrowser().from("reactions").delete().eq("id", r.id);
                        send("chat.reaction", {});
                        void qc.invalidateQueries({ queryKey: ["reactions", coupleId] });
                      }}
                      onDoubleTap={(x) => {
                        if (x.local) return;
                        haptic("select");
                        void react(x, "❤️");
                      }}
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
        </div>

        {tray && (
          <div className="an-sheet border-line bg-s1 flex-none border-t px-4 py-3">
            <div
              className="mb-2.5 flex items-center gap-2"
              role="tablist"
              aria-label="Sticker packs"
            >
              {(
                [
                  ["all", "Stickers"],
                  ["spicy", "Spicy"],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={stickerTab === k}
                  onClick={() => setStickerTab(k)}
                  className={cn(
                    "flex h-8 cursor-pointer items-center gap-1 rounded-full border-0 px-3 text-xs font-bold",
                    stickerTab === k
                      ? k === "spicy"
                        ? "bg-ember text-on-accent"
                        : "bg-accent text-on-accent"
                      : "bg-s2 text-muted",
                  )}
                >
                  {k === "spicy" && <Pepper size={14} weight="bold" aria-hidden />}
                  {label}
                </button>
              ))}
            </div>
            {stickerTab === "spicy" && !darkBoth ? (
              <div className="flex flex-col items-start gap-2 py-3">
                <p className="text-muted m-0 text-sm">
                  Spicy stickers open when you both turn on After Dark. Nobody gets them unless you
                  both say yes.
                </p>
                <a href="/dark" className="text-accent text-sm font-bold">
                  Open After Dark
                </a>
              </div>
            ) : (
              <div className="no-scrollbar grid max-h-[230px] grid-cols-4 gap-2.5 overflow-y-auto sm:grid-cols-6 lg:grid-cols-8">
                {(stickerTab === "spicy"
                  ? (stickers?.spicy ?? []).map((x) => x.id)
                  : [
                      ...(stickers?.recent ?? []).filter(
                        (id) => !id.startsWith("spicy-") || darkBoth,
                      ),
                      ...(stickers?.all
                        .map((x) => x.id)
                        .filter((id) => !stickers.recent.includes(id)) ?? []),
                    ]
                ).map((id, i) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => sendSticker(id)}
                    aria-label={`Send sticker ${STICKER_LABEL.get(id)}`}
                    className="press hover:bg-s2 flex aspect-square cursor-pointer items-center justify-center rounded-2xl border-0 bg-transparent p-0"
                    style={{ ["--i" as string]: i }}
                  >
                    <StickerArt id={id} label={STICKER_LABEL.get(id) ?? ""} size={72} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <ScheduledBar count={scheduled.items.length} onOpen={() => setScheduledOpen(true)} />
        {editing && (
          <div className="border-line bg-s1 flex flex-none items-center gap-2 border-t px-4 py-2 text-sm">
            <PencilSimple size={16} className="text-accent" aria-hidden />
            <span className="text-muted flex-1 truncate">Editing message</span>
            <IconButton
              label="Cancel edit"
              dim={36}
              onClick={() => {
                setEditing(null);
                setText("");
              }}
            >
              <X size={16} />
            </IconButton>
          </div>
        )}
        {replyTo && (
          <div
            className="border-line bg-s1 flex flex-none items-center gap-3 border-t py-1.5 pr-2 pl-4 text-sm"
            data-testid="reply-preview"
          >
            <ArrowBendUpLeft size={18} className="text-accent flex-none" aria-hidden />
            <button
              type="button"
              onClick={() => void jumpTo(replyTo.id, replyTo.sent_at)}
              className="flex min-w-0 flex-1 cursor-pointer items-stretch gap-2 border-0 bg-transparent p-0 text-left"
              aria-label={`Replying to ${replyTo.sender_id === me.id ? "yourself" : partner.name}. Show the message`}
            >
              <span aria-hidden className="bg-accent w-[3px] flex-none rounded-full" />
              <span className="flex min-w-0 flex-col">
                <span className="text-accent text-xs font-bold">
                  Replying to {replyTo.sender_id === me.id ? "yourself" : partner.name}
                </span>
                <span className="text-muted truncate">
                  {previewText(replyTo, replyTo.sender_id === me.id, mediaInfo)}
                </span>
              </span>
            </button>
            <IconButton label="Cancel reply" dim={44} onClick={() => setReplyTo(null)}>
              <X size={16} />
            </IconButton>
          </div>
        )}

        <form
          className="flex flex-none items-end gap-2 px-3 py-2.5 xl:px-[max(0.75rem,calc((100%-880px)/2))]"
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
                className="rounded-input bg-s2 flex h-11 min-w-0 flex-1 items-center gap-2.5 px-3.5 shadow-[inset_0_0_0_1.5px_var(--accent)]"
                role="status"
                aria-label={
                  holding ? "Recording. Release to send" : "Recording. Tap send when you're done"
                }
              >
                <span className="an-dot bg-danger h-2.5 w-2.5 flex-none rounded-full" aria-hidden />
                <span className="mono flex-none text-sm">
                  {Math.floor(recSecs / 60)}:{String(recSecs % 60).padStart(2, "0")}
                </span>
                <LiveWave level={micLevel} />
                <span className="text-muted hidden flex-none text-xs sm:inline">
                  {holding ? "Release to send" : "Tap send"}
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
                ref={captureRef}
                type="file"
                accept="image/*,video/*"
                capture="environment"
                hidden
                data-testid="camera-fallback"
                onChange={(e) => {
                  if (e.target.files?.length) setComposing(Array.from(e.target.files));
                  e.target.value = "";
                }}
              />
              <input
                ref={fileRef}
                data-testid="attach-input"
                type="file"
                accept="image/*,video/*"
                multiple
                hidden
                onChange={(e) => {
                  if (e.target.files?.length) setComposing(Array.from(e.target.files));
                  e.target.value = "";
                }}
              />
              <div className="rounded-input border-line bg-s2 focus-within:border-accent flex min-h-11 min-w-0 flex-1 items-end gap-1.5 border pr-1.5 pl-3.5">
                {/* A text area: Enter starts a new line; the Send button sends
                    (Ctrl or Cmd + Enter too, for keyboards). It grows to about five lines. */}
                <textarea
                  ref={composerRef}
                  rows={1}
                  enterKeyHint="enter"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      void sendText();
                      return;
                    }
                    if (e.key !== "Escape") return;
                    if (replyTo) setReplyTo(null);
                    else if (editing) {
                      setEditing(null);
                      setText("");
                    }
                  }}
                  aria-label={`Message ${partner.name}`}
                  placeholder={`Message ${partner.name}`}
                  value={text}
                  maxLength={4000}
                  onChange={(e) => onType(e.target.value)}
                  className="text-text field-sizing-content max-h-32 min-h-[42px] min-w-0 flex-1 resize-none overflow-y-auto border-0 bg-transparent py-[10px] text-base leading-[22px] outline-none focus-visible:shadow-none"
                />
                {text.trim() && !editing && (
                  <button
                    type="button"
                    onClick={() => setLaterOpen(true)}
                    aria-label="Schedule a message"
                    title="Schedule a message"
                    className="text-muted hover:text-text mb-[3px] flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-full border-0 bg-transparent"
                  >
                    <Clock size={22} />
                  </button>
                )}
                {!text && (
                  <button
                    type="button"
                    onClick={() => setCamera(true)}
                    aria-label="Camera"
                    className="text-muted hover:text-text mb-[3px] flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-full border-0 bg-transparent"
                  >
                    <Camera size={22} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setTray(!tray)}
                  aria-label="Stickers"
                  aria-expanded={tray}
                  className={cn(
                    "mb-[3px] flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-full border-0 bg-transparent",
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
            <ReactRow
              current={reactions.get(actionFor.id)?.find((r) => r.user_id === me.id)?.emoji ?? null}
              onPick={(e) => react(actionFor, e)}
            />
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
                  startReply(actionFor);
                  setActionFor(null);
                }}
              />
              {(() => {
                // Photos in a chat message can go straight onto the Keep timeline.
                const photos = actionFor.removed_at
                  ? []
                  : actionFor.media_ids.filter((id) => mediaInfo.get(id)?.kind === "image");
                return photos.length ? (
                  <SheetAction
                    icon={<Archive size={20} />}
                    label="Add to Keep"
                    onClick={() => {
                      setKeepFor({ ids: photos, sentAt: actionFor.sent_at });
                      setActionFor(null);
                    }}
                  />
                ) : null;
              })()}
              {!actionFor.removed_at &&
                ["text", "voice", "media", "sticker"].includes(actionFor.type) &&
                (pinned.has(actionFor.id) ? (
                  <SheetAction
                    icon={<PushPinSlash size={20} />}
                    label="Unpin"
                    onClick={() => {
                      void unpin(actionFor.id);
                      setActionFor(null);
                    }}
                  />
                ) : (
                  <SheetAction
                    icon={<PushPin size={20} />}
                    label="Pin"
                    onClick={() => {
                      void pin(actionFor);
                      setActionFor(null);
                    }}
                  />
                ))}
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
              {actionFor.sender_id === me.id &&
                actionFor.type === "text" &&
                !actionFor.removed_at &&
                now.getTime() - new Date(actionFor.sent_at).getTime() < 15 * 60 * 1000 && (
                  <SheetAction
                    icon={<PencilSimple size={20} />}
                    label="Edit"
                    onClick={() => {
                      setEditing(actionFor);
                      setReplyTo(null);
                      setText(actionFor.body ?? "");
                      setActionFor(null);
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

      {keepFor && (
        <AddToKeepSheet
          key={keepFor.ids.join(",")}
          open
          onOpenChange={(v) => !v && setKeepFor(null)}
          mediaIds={keepFor.ids}
          sentAt={keepFor.sentAt}
        />
      )}

      <Sheet open={moreOpen} onOpenChange={setMoreOpen} title="Chat options" handle>
        <div className="rounded-card border-line bg-s2 overflow-hidden border">
          <SheetAction
            icon={<MagnifyingGlass size={20} />}
            label="Search messages"
            onClick={() => {
              setMoreOpen(false);
              setSearchOpen(true);
            }}
          />
          <SheetAction
            icon={<PushPin size={20} />}
            label={pins.length ? `Pinned messages (${pins.length})` : "Pinned messages"}
            onClick={() => {
              setMoreOpen(false);
              setPinsOpen(true);
            }}
          />
          <SheetAction
            icon={<MagnifyingGlass size={20} />}
            label="Search everything"
            onClick={() => {
              setMoreOpen(false);
              router.push("/search");
            }}
          />
          <SheetAction
            icon={<Palette size={20} />}
            label="Customise chat"
            onClick={() => {
              setMoreOpen(false);
              setLookOpen(true);
            }}
          />
          <SheetAction
            icon={<ImagesSquare size={20} />}
            label="Photos and videos"
            onClick={() => {
              setMoreOpen(false);
              router.push("/chat/media");
            }}
          />
          <SheetAction
            icon={<UserCircle size={20} />}
            label={`${partner.name}'s profile`}
            onClick={() => {
              setMoreOpen(false);
              openPartner();
            }}
            last
          />
        </div>
      </Sheet>

      <ChatSearch
        open={searchOpen}
        onOpenChange={setSearchOpen}
        meId={me.id}
        partnerName={partner.name}
        onJump={(h) => {
          setSearchOpen(false);
          void jumpTo(h.id, h.sent_at);
        }}
      />
      <SendLaterSheet
        open={laterOpen}
        onOpenChange={setLaterOpen}
        preview={text.trim()}
        onPick={(at) => void scheduleText(at)}
      />
      <ScheduledSheet
        open={scheduledOpen}
        onOpenChange={setScheduledOpen}
        items={scheduled.items}
        onCancel={async (x) => {
          const gone = await scheduled.cancel(x);
          if (gone && !text.trim()) {
            setText(gone.body);
            setScheduledOpen(false);
            composerRef.current?.focus();
          }
        }}
      />
      <PinsSheet
        open={pinsOpen}
        onOpenChange={setPinsOpen}
        pins={pins}
        meId={me.id}
        partnerName={partner.name}
        onJump={(id, at) => void jumpTo(id, at)}
        onUnpin={(id) => void unpin(id)}
      />

      <Sheet open={lookOpen} onOpenChange={setLookOpen} title="Customise chat" handle>
        <div className="display text-[28px]">Make it yours</div>
        <p className="text-muted m-0 text-sm">{partner.name} sees the same look.</p>
        <LookPicker look={look} onChange={(next) => void saveLook(next)} />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => wallInput.current?.click()}
            className={cn(
              "rounded-input bg-s2 relative flex h-16 w-24 flex-none cursor-pointer items-center justify-center overflow-hidden border-2 p-0",
              look.wallpaper === "custom" ? "border-accent" : "border-line",
            )}
            aria-label={look.media ? "Change wallpaper photo" : "Use your own photo"}
          >
            {look.wallpaper === "custom" && (
              <span className="bg-accent text-on-accent absolute top-1.5 right-1.5 z-[1] flex h-5 w-5 items-center justify-center rounded-full">
                <Check size={12} weight="bold" aria-hidden />
              </span>
            )}
            {look.media ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/media/${look.media}/view`}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : wallBusy ? (
              <LoadingDots className="text-accent" />
            ) : (
              <ImagesSquare size={24} className="text-muted" />
            )}
          </button>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-sm font-semibold">Your photo</span>
            <span className="text-muted text-xs">Any photo, shared with {partner.name}.</span>
            {look.media && look.wallpaper !== "custom" && (
              <button
                type="button"
                onClick={() => void saveLook({ ...look, wallpaper: "custom" })}
                className="text-accent cursor-pointer self-start border-0 bg-transparent p-0 text-xs font-bold"
              >
                Use it again
              </button>
            )}
          </div>
          <input
            ref={wallInput}
            type="file"
            accept="image/*"
            hidden
            data-testid="wallpaper-input"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              setWallBusy(true);
              try {
                const img = await compressImage(f);
                const r = await uploadMedia(img.blob, {
                  kind: "image",
                  width: img.width,
                  height: img.height,
                });
                await saveLook({ ...look, wallpaper: "custom", media: r.id });
                toast.ok("Wallpaper set.");
              } catch {
                toast.err("That photo didn't upload.");
              } finally {
                setWallBusy(false);
              }
            }}
          />
        </div>
        <div className="rounded-card border-line bg-s2 overflow-hidden border">
          <Toggle
            label="Blur the wallpaper"
            sub="Softer behind your messages, easier to read."
            checked={look.blur}
            onChange={(v) => void saveLook({ ...look, blur: v })}
            last
          />
        </div>
      </Sheet>

      {camera && (
        <CameraCapture
          onClose={() => setCamera(false)}
          onFallback={cameraFallback}
          onShot={(f) => {
            setCamera(false);
            setComposing([f]);
          }}
        />
      )}
      {composing && (
        <MediaComposer
          files={composing}
          partnerName={partner.name}
          onCancel={() => setComposing(null)}
          onSend={(files, caption) => {
            setComposing(null);
            void sendFiles(files, caption);
          }}
        />
      )}
    </div>
  );
}

/** Quick reactions, your current one highlighted (tap it again to remove), plus any emoji. */
function ReactRow({ current, onPick }: { current: string | null; onPick: (e: string) => void }) {
  const [custom, setCustom] = useState(false);
  const quick =
    current && !REACTIONS.includes(current)
      ? [current, ...REACTIONS.slice(0, REACTIONS.length - 1)]
      : REACTIONS;
  if (custom)
    return (
      <EmojiPicker label="React with any emoji" onPick={onPick} onClose={() => setCustom(false)} />
    );
  return (
    <div
      className="grid grid-cols-6 justify-items-center gap-1.5 sm:grid-cols-11"
      role="group"
      aria-label="React"
    >
      {quick.map((e) => {
        const on = current === e;
        return (
          <button
            key={e}
            type="button"
            onClick={() => onPick(e)}
            aria-label={on ? `Remove your ${e} reaction` : `React ${e}`}
            aria-pressed={on}
            className={cn(
              "press flex aspect-square w-full max-w-[52px] cursor-pointer items-center justify-center rounded-full border-0 text-[22px]",
              on ? "bg-accent/10 shadow-[inset_0_0_0_1.5px_var(--accent)]" : "bg-s2",
            )}
          >
            {e}
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => setCustom(true)}
        aria-label="React with any emoji"
        className="press bg-s2 text-muted flex aspect-square w-full max-w-[52px] cursor-pointer items-center justify-center rounded-full border-0"
      >
        <Plus size={22} weight="bold" />
      </button>
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

/**
 * Desktop side panel (xl+): your partner, big, with what you need while you
 * talk: their time and weather, one-click call, video and clink, what you're
 * counting down to, and the photos you've shared lately.
 */
function SharedPanel() {
  const { coupleId, partner, presence, me } = useCouple();
  const now = useCoupleNow(30_000);
  const openPartner = useOpenPartner();
  const { start } = useCall();
  const { sendClink } = useSendClink();
  const weather = useWeather(partner).data;
  const { data: countdowns } = useCountdowns();
  const next = (countdowns ?? []).find((c) => Date.parse(c.target_at!) > now.getTime());
  const left = next ? countdownParts(now, new Date(next.target_at!)) : null;
  const online = presence.online;
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
  const action =
    "press bg-s2 text-text hover:bg-s3 flex flex-col items-center gap-1.5 rounded-[16px] border-0 py-3 text-xs font-semibold cursor-pointer";
  return (
    <aside
      className="border-line hidden w-[340px] flex-none flex-col gap-5 overflow-y-auto border-l p-5 xl:flex 2xl:w-[380px] 2xl:p-6"
      aria-label={`${partner.name} and what you share`}
    >
      <button
        type="button"
        onClick={openPartner}
        className="press text-text flex cursor-pointer flex-col items-center gap-3 border-0 bg-transparent pt-2 text-center"
      >
        <span className="relative">
          <Avatar
            name={partner.name}
            side="partner"
            size={112}
            sizes={{ xl: 136 }}
            photoUrl={partner.avatarUrl}
            icon={partner.avatarIcon}
            dim={!online}
          />
          {online && (
            <span
              aria-hidden
              className="bg-online absolute right-2 bottom-2 h-5 w-5 rounded-full shadow-[0_0_0_3px_var(--bg-app)]"
            />
          )}
        </span>
        <span className="display text-[26px] leading-none">{partner.name}</span>
        <span className="text-muted text-sm">
          {online ? "Online" : "Away"}
          {partner.city ? ` · ${partner.city}` : ""}
        </span>
        <span className="sr-only">See {partner.name}&apos;s full profile</span>
      </button>

      <div className="rounded-card bg-s1 border-line flex items-center justify-between gap-3 border px-4 py-3">
        <div>
          <div className="text-faint text-xs">Their time</div>
          <div className="mono text-[28px] leading-tight">{formatClock(now, partner.timezone)}</div>
        </div>
        <div className="text-muted text-right text-sm">
          {weather?.temp != null ? (
            <>
              <div className="text-text text-base font-semibold">{weather.temp}°</div>
              <div>{weather.label}</div>
            </>
          ) : (
            <div>{formatClock(now, me.timezone)} for you</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <button
          type="button"
          className={action}
          onClick={() => start(false)}
          aria-label={`Call ${partner.name}`}
        >
          <Phone size={20} aria-hidden /> Call
        </button>
        <button
          type="button"
          className={action}
          onClick={() => start(true)}
          aria-label={`Video call ${partner.name}`}
        >
          <VideoCamera size={20} aria-hidden /> Video
        </button>
        <button
          type="button"
          className={action}
          onClick={() => void sendClink("tap")}
          aria-label={`Clink ${partner.name}`}
        >
          <Wine size={20} aria-hidden /> Clink
        </button>
        <button
          type="button"
          className={action}
          onClick={openPartner}
          aria-label={`${partner.name}'s profile`}
        >
          <UserCircle size={20} aria-hidden /> Profile
        </button>
      </div>

      {next && left && (
        <Link
          href="/us/countdowns"
          className="rounded-card bg-s1 border-line text-text hover:text-text hover:bg-s2 flex items-center gap-3 border px-4 py-3"
        >
          <KindIcon kind={next.kind} size={22} className="text-accent flex-none" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{next.title}</span>
            <span className="text-muted block text-xs">
              {left.days > 0
                ? `${left.days} d ${left.hours} h to go`
                : `${left.hours} h ${left.minutes} min to go`}
            </span>
          </span>
        </Link>
      )}

      <section className="flex flex-col gap-3" aria-label="Shared lately">
        <h2 className="m-0 text-base font-bold">Shared lately</h2>
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
        <Link href="/keep" className="text-sm font-medium">
          Favourites live on the memory wall
        </Link>
      </section>
    </aside>
  );
}

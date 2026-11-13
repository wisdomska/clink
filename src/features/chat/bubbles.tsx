"use client";
import Link from "next/link";
import { useRef } from "react";
import { Wine, Microphone, WarningCircle, Image as ImageIcon, ArrowBendUpLeft, EyeSlash } from "@phosphor-icons/react";
import type { MediaInfo, Reaction, UiMessage } from "./types";
import { VoicePlayer } from "./voice-player";
import { cn } from "@/components/ui/cn";

export const STICKER_LABEL = new Map<string, string>();

function mediaUrl(id: string) {
  return `/api/media/${id}/view`;
}

function ReactionPill({ reactions }: { reactions: Reaction[] }) {
  if (!reactions.length) return null;
  return (
    <div className="absolute -right-2 -bottom-3 flex items-center gap-0.5 rounded-full border border-line bg-s3 px-2 py-0.5 text-sm" aria-label={`Reactions: ${reactions.map((r) => r.emoji ?? "voice").join(", ")}`}>
      {reactions.map((r) => (r.voice_media_id ? <Microphone key={r.id} size={14} aria-hidden /> : <span key={r.id}>{r.emoji}</span>))}
    </div>
  );
}

function ReplyQuote({ target, targetMine, media }: { target?: UiMessage; targetMine: boolean; media: Map<string, MediaInfo> }) {
  if (!target) return null;
  let label = target.body ?? "";
  let Icon: typeof Microphone | null = null;
  if (target.type === "voice") {
    const info = media.get(target.media_ids[0] ?? "");
    const d = Number(info?.duration_s ?? 0);
    label = `${targetMine ? "Your voice note" : "Voice note"}${d ? ` · ${Math.floor(d / 60)}:${String(Math.round(d % 60)).padStart(2, "0")}` : ""}`;
    Icon = Microphone;
  } else if (target.type === "media") {
    label = targetMine ? "Your photo" : "Photo";
    Icon = ImageIcon;
  } else if (target.type === "sticker") label = `Sticker: ${STICKER_LABEL.get(target.sticker_id ?? "") ?? ""}`;
  if (target.removed_at) label = "Removed";
  return (
    <div className="flex items-center gap-1.5 rounded-thumb bg-s2 px-2.5 py-1.5 text-[13px] text-muted">
      {Icon ? <Icon size={14} aria-hidden /> : <ArrowBendUpLeft size={14} aria-hidden />}
      <span className="truncate">{label}</span>
    </div>
  );
}

export function Bubble({
  m,
  mine,
  partnerName,
  media,
  reactions,
  replyTarget,
  onLongPress,
  onSwipeReply,
  onRetry,
}: {
  m: UiMessage;
  mine: boolean;
  partnerName: string;
  media: Map<string, MediaInfo>;
  reactions: Reaction[];
  replyTarget?: UiMessage;
  onLongPress: (m: UiMessage) => void;
  onSwipeReply: (m: UiMessage) => void;
  onRetry: (m: UiMessage) => void;
}) {
  const press = useRef<{ x: number; t: ReturnType<typeof setTimeout> | null; dx: number }>({ x: 0, t: null, dx: 0 });
  const el = useRef<HTMLDivElement>(null);

  if (m.type === "clink") {
    const time = new Date(m.sent_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const what = m.body?.startsWith("hold:") ? `held the Clink together, ${m.body.slice(5)} s` : m.body === "back" ? "clinked back" : "sent a Clink";
    return (
      <div className="mono flex items-center gap-1.5 self-center pt-2.5 pb-1 text-xs text-faint">
        <Wine size={14} className="text-accent" aria-hidden />
        {mine ? "You" : partnerName} {what}, {time}
      </div>
    );
  }

  const handlers = {
    onPointerDown: (e: React.PointerEvent) => {
      press.current.x = e.clientX;
      press.current.dx = 0;
      press.current.t = setTimeout(() => onLongPress(m), 450);
    },
    onPointerMove: (e: React.PointerEvent) => {
      const dx = Math.max(0, e.clientX - press.current.x);
      if (dx > 8 && press.current.t) {
        clearTimeout(press.current.t);
        press.current.t = null;
      }
      if (e.pointerType === "touch" && el.current) {
        press.current.dx = dx;
        el.current.style.transform = `translateX(${Math.min(dx, 80)}px)`;
      }
    },
    onPointerUp: () => {
      if (press.current.t) clearTimeout(press.current.t);
      if (press.current.dx > 64) onSwipeReply(m);
      if (el.current) el.current.style.transform = "";
      press.current.dx = 0;
    },
    onPointerCancel: () => {
      if (press.current.t) clearTimeout(press.current.t);
      if (el.current) el.current.style.transform = "";
    },
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      onLongPress(m);
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onLongPress(m);
      }
    },
  };

  const side = mine ? "self-end" : "self-start";
  const removed = Boolean(m.removed_at);
  if (m.type === "sensitive") {
    // SAF-02: private media is only ever a blurred card in chat; it opens in After Dark.
    return (
      <Link href={`/dark/view/${m.media_ids[0]}`} className={cn("press relative flex h-[120px] w-[180px] flex-col items-center justify-center gap-1 overflow-hidden rounded-thumb text-text hover:text-text", side)} aria-label="Private. Open in After Dark">
        <span aria-hidden className="absolute -inset-4" style={{ background: "radial-gradient(circle at 30% 40%,rgba(255,90,60,.55),transparent 45%),#211E25", filter: "blur(14px)" }} />
        <EyeSlash size={20} className="relative" aria-hidden />
        <span className="relative text-xs font-medium">{mine ? "You sent something private" : "Something private"}</span>
      </Link>
    );
  }
  let content: React.ReactNode;

  if (removed) {
    content = (
      <div className={cn("rounded-[20px] border border-dashed border-line px-3.5 py-2.5 text-sm text-faint", side)}>{mine ? "You removed this" : "Removed by sender"}</div>
    );
  } else if (m.type === "sticker") {
    content = (
      <div className={cn("display flex h-24 w-24 items-center justify-center rounded-full border border-line bg-s1 text-[22px] text-accent", side)} style={{ transform: "rotate(-8deg)" }}>
        {STICKER_LABEL.get(m.sticker_id ?? "") ?? "clink!"}
      </div>
    );
  } else if (m.type === "voice") {
    const id = m.media_ids[0];
    const info = id ? media.get(id) : undefined;
    const local = m.localMedia?.[0];
    content = (
      <div className={cn("flex w-full flex-col", mine ? "items-end" : "items-start")}>
        <VoicePlayer src={local?.url ?? (id ? mediaUrl(id) : "")} duration={Number(info?.duration_s ?? 0)} waveform={info?.waveform ?? null} mine={mine} />
      </div>
    );
  } else if (m.type === "media") {
    const items = m.localMedia ?? m.media_ids.map((id) => ({ url: mediaUrl(id), kind: media.get(id)?.kind ?? "image", id }));
    content = (
      <div className={cn("grid w-[70%] max-w-[420px] gap-1", items.length > 1 ? "grid-cols-2" : "grid-cols-1", side)}>
        {items.map((it, i) => {
          const id = "id" in it ? (it.id as string) : null;
          const tile =
            it.kind === "video" ? (
              <video src={it.url} preload="metadata" muted playsInline className="h-full w-full object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={it.url} alt="Shared photo" loading="lazy" className="h-full w-full object-cover" />
            );
          return id ? (
            <Link key={i} href={`/chat/media/${id}`} className="stripe relative block aspect-[4/5] overflow-hidden rounded-thumb" aria-label="Open media">
              {tile}
            </Link>
          ) : (
            <div key={i} className="stripe relative aspect-[4/5] overflow-hidden rounded-thumb">
              {tile}
              {"progress" in it && it.progress !== undefined && it.progress < 1 && (
                <div className="absolute inset-x-2 bottom-2 h-1 overflow-hidden rounded-full bg-line">
                  <div className="h-full bg-accent" style={{ width: `${Math.round(it.progress * 100)}%` }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  } else {
    content = (
      <div
        className="max-w-[78%] px-3.5 py-2.5 text-base leading-[1.4] break-words whitespace-pre-wrap"
        style={{
          borderRadius: mine ? "var(--r-bubble-out)" : "var(--r-bubble-in)",
          background: mine ? "var(--surface-3)" : "var(--surface-1)",
          border: mine ? "none" : "1px solid var(--line)",
          opacity: m.local === "sending" ? 0.7 : 1,
        }}
      >
        {replyTarget && (
          <div className="mb-1.5">
            <ReplyQuote target={replyTarget} targetMine={replyTarget.sender_id === m.sender_id ? mine : !mine} media={media} />
          </div>
        )}
        {m.body}
      </div>
    );
  }

  return (
    <div className={cn("relative flex flex-col", mine ? "items-end" : "items-start", reactions.length > 0 && "mb-3")}>
      <div
        ref={el}
        role="button"
        tabIndex={0}
        aria-label={`${mine ? "You" : partnerName}: ${m.type === "text" ? m.body : m.type}. Press for reactions.`}
        className={cn("relative flex w-full touch-pan-y flex-col transition-transform duration-150 select-none", mine ? "items-end" : "items-start")}
        {...handlers}
      >
        {replyTarget && m.type !== "text" && (
          <div className="mb-1 max-w-[78%]">
            <ReplyQuote target={replyTarget} targetMine={replyTarget.sender_id === m.sender_id ? mine : !mine} media={media} />
          </div>
        )}
        <div className="relative max-w-full">
          {content}
          <ReactionPill reactions={reactions} />
        </div>
      </div>
      {m.local === "failed" && (
        <button type="button" onClick={() => onRetry(m)} className="flex cursor-pointer items-center gap-1.5 self-end border-0 bg-transparent py-1 text-sm font-medium text-danger">
          <WarningCircle size={16} aria-hidden />
          Not sent. Tap to retry
        </button>
      )}
    </div>
  );
}

"use client";
import Link from "next/link";
import { useRef } from "react";
import {
  Wine,
  Microphone,
  WarningCircle,
  Image as ImageIcon,
  ArrowBendUpLeft,
  EyeSlash,
} from "@phosphor-icons/react";
import type { MediaInfo, Reaction, UiMessage } from "./types";
import { VoicePlayer } from "./voice-player";
import { CallLogRow } from "@/features/call/call-log-row";
import { StickerArt } from "./sticker-art";
import { cn } from "@/components/ui/cn";

export const STICKER_LABEL = new Map<string, string>();

/** Where a message sits in a run from the same person (iMessage/WhatsApp grouping). */
export type GroupPos = "single" | "first" | "middle" | "last";

const R = 20; // outer corner
const J = 6; // joined corner, toward the sender's side
function radius(mine: boolean, pos: GroupPos) {
  const top = pos === "middle" || pos === "last" ? J : R;
  const bottom = pos === "first" || pos === "middle" || pos === "single" ? J : R;
  // order: top-left top-right bottom-right bottom-left
  return mine ? `${R}px ${top}px ${bottom}px ${R}px` : `${top}px ${R}px ${R}px ${bottom}px`;
}

function clock(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function mediaUrl(id: string) {
  return `/api/media/${id}/view`;
}

function ReactionPill({ reactions }: { reactions: Reaction[] }) {
  if (!reactions.length) return null;
  return (
    <div
      role="img"
      className="border-line bg-s3 absolute -right-2 -bottom-3 flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-sm"
      aria-label={`Reactions: ${reactions.map((r) => r.emoji ?? "voice").join(", ")}`}
    >
      {reactions.map((r) =>
        r.voice_media_id ? (
          <Microphone key={r.id} size={14} aria-hidden />
        ) : (
          <span key={r.id}>{r.emoji}</span>
        ),
      )}
    </div>
  );
}

function ReplyQuote({
  target,
  targetMine,
  media,
}: {
  target?: UiMessage;
  targetMine: boolean;
  media: Map<string, MediaInfo>;
}) {
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
  } else if (target.type === "sticker")
    label = `Sticker: ${STICKER_LABEL.get(target.sticker_id ?? "") ?? ""}`;
  if (target.removed_at) label = "Removed";
  return (
    <div className="rounded-thumb bg-s2 text-muted flex items-center gap-1.5 px-2.5 py-1.5 text-[13px]">
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
  pos = "single",
}: {
  pos?: GroupPos;
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
  const press = useRef<{ x: number; t: ReturnType<typeof setTimeout> | null; dx: number }>({
    x: 0,
    t: null,
    dx: 0,
  });
  const el = useRef<HTMLDivElement>(null);

  if (m.type === "system" && m.body?.startsWith("call:")) {
    return <CallLogRow body={m.body} mine={mine} partnerName={partnerName} at={m.sent_at} />;
  }

  if (m.type === "clink") {
    const time = new Date(m.sent_at).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const what = m.body?.startsWith("hold:")
      ? `held the Clink together, ${m.body.slice(5)} s`
      : m.body === "back"
        ? "clinked back"
        : "sent a Clink";
    return (
      <div className="mono text-faint flex items-center gap-1.5 self-center pt-2.5 pb-1 text-xs">
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
      <Link
        href={`/dark/view/${m.media_ids[0]}`}
        className={cn(
          "press rounded-thumb text-text hover:text-text relative flex h-[120px] w-[180px] flex-col items-center justify-center gap-1 overflow-hidden",
          side,
        )}
        aria-label="Private. Open in After Dark"
      >
        <span
          aria-hidden
          className="absolute -inset-4"
          style={{
            background:
              "radial-gradient(circle at 30% 40%,rgba(255,90,60,.55),transparent 45%),#211E25",
            filter: "blur(14px)",
          }}
        />
        <EyeSlash size={20} className="relative" aria-hidden />
        <span className="relative text-xs font-medium">
          {mine ? "You sent something private" : "Something private"}
        </span>
      </Link>
    );
  }
  let content: React.ReactNode;

  if (removed) {
    content = (
      <div
        className={cn(
          "border-line text-faint rounded-[20px] border border-dashed px-3.5 py-2.5 text-sm",
          side,
        )}
      >
        {mine ? "You removed this" : "Removed by sender"}
      </div>
    );
  } else if (m.type === "sticker") {
    content = (
      <div
        className={cn("an-pop", side)}
        role="img"
        aria-label={`Sticker: ${STICKER_LABEL.get(m.sticker_id ?? "") ?? ""}`}
      >
        <StickerArt
          id={m.sticker_id ?? ""}
          label={STICKER_LABEL.get(m.sticker_id ?? "") ?? ""}
          size={128}
        />
      </div>
    );
  } else if (m.type === "voice") {
    const id = m.media_ids[0];
    const info = id ? media.get(id) : undefined;
    const local = m.localMedia?.[0];
    content = (
      <div className={cn("flex w-full flex-col", mine ? "items-end" : "items-start")}>
        <VoicePlayer
          src={local?.url ?? (id ? mediaUrl(id) : "")}
          duration={Number(info?.duration_s ?? 0)}
          waveform={info?.waveform ?? null}
          mine={mine}
        />
      </div>
    );
  } else if (m.type === "media") {
    const items =
      m.localMedia ??
      m.media_ids.map((id) => ({ url: mediaUrl(id), kind: media.get(id)?.kind ?? "image", id }));
    // Messenger-style layouts: 1 tall, 2 side by side, 3 = one big + two,
    // 4+ = a 2x2 grid with "+N" on the last tile.
    const shown = items.slice(0, 4);
    const extra = items.length - shown.length;
    const n = shown.length;
    content = (
      <div
        className={cn("w-[min(72vw,320px)] overflow-hidden", side)}
        style={{
          borderRadius: radius(mine, pos),
          background: mine ? "var(--surface-3)" : "var(--surface-1)",
        }}
      >
        <div
          className={cn(
            "grid gap-0.5",
            n === 1 ? "grid-cols-1" : "grid-cols-2",
            n === 3 && "grid-rows-2",
          )}
        >
          {shown.map((it, i) => {
            const id = "id" in it ? (it.id as string) : null;
            const aspect = n === 1 ? "aspect-[4/5]" : n === 2 ? "aspect-[3/4]" : "aspect-square";
            const span = n === 3 && i === 0 ? "row-span-2 aspect-auto h-full" : aspect;
            const tile =
              it.kind === "video" ? (
                <video
                  src={it.url}
                  preload="metadata"
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={it.url}
                  alt="Shared photo"
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.03]"
                />
              );
            const more =
              extra > 0 && i === n - 1 ? (
                <span className="display absolute inset-0 flex items-center justify-center bg-black/50 text-[28px] text-white">
                  +{extra}
                </span>
              ) : null;
            return id ? (
              <Link
                key={i}
                href={`/chat/media/${id}`}
                className={cn("stripe relative block overflow-hidden", span)}
                aria-label="Open media"
              >
                {tile}
                {more}
              </Link>
            ) : (
              <div key={i} className={cn("stripe relative overflow-hidden", span)}>
                {tile}
                {more}
                {"progress" in it && it.progress !== undefined && it.progress < 1 && (
                  <div className="absolute inset-0 flex items-end bg-black/30 p-2">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/25">
                      <div
                        className="h-full rounded-full bg-white transition-[width] duration-300"
                        style={{ width: `${Math.max(4, Math.round(it.progress * 100))}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {m.body && (
          <div className="px-3 pt-2 pb-1.5 text-base leading-[1.35] [overflow-wrap:anywhere] whitespace-pre-wrap">
            {m.body}
            <span
              aria-hidden
              className="mono text-faint relative top-[5px] float-right ml-2.5 text-[11px] leading-none"
            >
              {clock(m.sent_at)}
            </span>
          </div>
        )}
      </div>
    );
  } else {
    // Short messages hug their text; long ones wrap at the column edge. The time
    // floats in the last line (WhatsApp style) so it never forces a new line.
    const emojiOnly =
      /^(\p{Extended_Pictographic}|\p{Emoji_Component}|\s){1,8}$/u.test(m.body ?? "") &&
      !/^[\d#*\s]+$/.test(m.body ?? "");
    content =
      emojiOnly && !replyTarget ? (
        <div
          className="px-1 text-[40px] leading-[1.15]"
          style={{ opacity: m.local === "sending" ? 0.7 : 1 }}
        >
          {m.body}
        </div>
      ) : (
        <div
          className="w-fit max-w-full px-3.5 pt-2 pb-1.5 text-base leading-[1.35] [overflow-wrap:anywhere] whitespace-pre-wrap"
          style={{
            borderRadius: radius(mine, pos),
            background: mine ? "var(--bubble-out, var(--surface-3))" : "var(--surface-1)",
            border: mine ? "none" : "1px solid var(--line)",
            opacity: m.local === "sending" ? 0.7 : 1,
          }}
        >
          {replyTarget && (
            <div className="mb-1.5">
              <ReplyQuote
                target={replyTarget}
                targetMine={replyTarget.sender_id === m.sender_id ? mine : !mine}
                media={media}
              />
            </div>
          )}
          {m.body}
          <span
            aria-hidden
            className="mono text-faint relative top-[5px] float-right ml-2.5 text-[11px] leading-none select-none"
          >
            {m.local === "sending" ? "..." : clock(m.sent_at)}
          </span>
        </div>
      );
  }

  return (
    <div
      className={cn(
        "relative flex flex-col",
        mine ? "items-end" : "items-start",
        (pos === "middle" || pos === "last") && "-mt-1.5",
        reactions.length > 0 && "mb-3",
      )}
    >
      <div
        ref={el}
        role="button"
        tabIndex={0}
        aria-label={`${mine ? "You" : partnerName}: ${m.type === "text" ? m.body : m.type}. Press for reactions.`}
        className={cn(
          "relative flex w-full touch-pan-y flex-col transition-transform duration-150 select-none",
          mine ? "items-end" : "items-start",
        )}
        {...handlers}
      >
        {replyTarget && m.type !== "text" && (
          <div className="mb-1 max-w-[80%]">
            <ReplyQuote
              target={replyTarget}
              targetMine={replyTarget.sender_id === m.sender_id ? mine : !mine}
              media={media}
            />
          </div>
        )}
        <div className="relative max-w-[80%] md:max-w-[min(80%,560px)]">
          {content}
          <ReactionPill reactions={reactions} />
        </div>
      </div>
      {m.local === "failed" && (
        <button
          type="button"
          onClick={() => onRetry(m)}
          className="text-danger flex cursor-pointer items-center gap-1.5 self-end border-0 bg-transparent py-1 text-sm font-medium"
        >
          <WarningCircle size={16} aria-hidden />
          Not sent. Tap to retry
        </button>
      )}
    </div>
  );
}

"use client";
import Link from "next/link";
import { useRef } from "react";
import {
  ArrowBendUpLeft,
  Wine,
  Microphone,
  WarningCircle,
  Image as ImageIcon,
  EyeSlash,
  PushPin,
} from "@phosphor-icons/react";
import type { MediaInfo, Message, Reaction, UiMessage } from "./types";
import { VoicePlayer } from "./voice-player";
import { CallLogRow } from "@/features/call/call-log-row";
import { StickerArt } from "./sticker-art";
import { cn } from "@/components/ui/cn";
import { haptic } from "@/lib/feedback";

export const STICKER_LABEL = new Map<string, string>();

/** Where a message sits in a run from the same person (iMessage/WhatsApp grouping). */
export type GroupPos = "single" | "first" | "middle" | "last";

const R = 20; // outer corner
const J = 6; // joined corner, toward the sender's side
// Corner sizes come from Appearance (round, soft or square bubbles).
const RV = `var(--bubble-r, ${R}px)`;
const JV = `var(--bubble-j, ${J}px)`;
function radius(mine: boolean, pos: GroupPos) {
  const top = pos === "middle" || pos === "last" ? JV : RV;
  const bottom = pos === "first" || pos === "middle" || pos === "single" ? JV : RV;
  // order: top-left top-right bottom-right bottom-left
  return mine ? `${RV} ${top} ${bottom} ${RV}` : `${top} ${RV} ${RV} ${bottom}`;
}

function clock(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function mediaUrl(id: string) {
  return `/api/media/${id}/view`;
}

function ReactionPill({
  reactions,
  meId,
  onTapOwn,
  onTapOther,
}: {
  reactions: Reaction[];
  meId: string;
  onTapOwn: (r: Reaction) => void;
  onTapOther: () => void;
}) {
  if (!reactions.length) return null;
  return (
    <div
      role="group"
      className="border-line bg-s3 absolute -right-2 -bottom-3 z-[1] flex items-center gap-0.5 rounded-full border p-0.5 text-sm"
      aria-label={`Reactions: ${reactions.map((r) => r.emoji ?? "voice").join(", ")}`}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {reactions.map((r) => {
        const own = r.user_id === meId;
        return (
          <button
            key={r.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (own) onTapOwn(r);
              else onTapOther();
            }}
            aria-label={
              own
                ? `Your reaction ${r.emoji ?? "voice"}. Tap to remove`
                : `Their reaction ${r.emoji ?? "voice"}`
            }
            className={cn(
              "flex h-7 min-w-7 cursor-pointer items-center justify-center rounded-full border-0 px-1 transition-colors",
              own ? "bg-accent/30" : "bg-transparent",
            )}
          >
            {r.voice_media_id ? <Microphone size={14} aria-hidden /> : r.emoji}
          </button>
        );
      })}
    </div>
  );
}

function voiceLength(d: number) {
  return d ? ` ${Math.floor(d / 60)}:${String(Math.round(d % 60)).padStart(2, "0")}` : "";
}

/** One-line summary of a message for quotes, pins and search ("Photo", "Voice note 0:12"). */
export function previewText(
  m: Pick<Message, "type" | "body" | "sticker_id" | "removed_at" | "media_ids">,
  mine: boolean,
  media?: Map<string, MediaInfo>,
): string {
  if (m.removed_at) return "Removed";
  if (m.type === "voice") {
    const d = Number(media?.get(m.media_ids[0] ?? "")?.duration_s ?? 0);
    return `${mine ? "Your voice note" : "Voice note"}${voiceLength(d)}`;
  }
  if (m.type === "media") {
    const kind = media?.get(m.media_ids[0] ?? "")?.kind;
    const what = kind === "video" ? "video" : "photo";
    const label = mine ? `Your ${what}` : what === "video" ? "Video" : "Photo";
    return m.body ? `${label}: ${m.body}` : label;
  }
  if (m.type === "sticker") return `Sticker: ${STICKER_LABEL.get(m.sticker_id ?? "") ?? ""}`.trim();
  return m.body ?? "";
}

function ReplyQuote({
  target,
  targetMine,
  who,
  media,
  onJump,
}: {
  target?: UiMessage;
  targetMine: boolean;
  who: string;
  media: Map<string, MediaInfo>;
  onJump?: (id: string, at: string) => void;
}) {
  if (!target) return null;
  const label = previewText(target, targetMine, media);
  const Icon = target.removed_at
    ? null
    : target.type === "voice"
      ? Microphone
      : target.type === "media"
        ? ImageIcon
        : null;
  return (
    <button
      type="button"
      data-testid="reply-quote"
      aria-label={`Replying to ${who}: ${label}. Go to message`}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onJump?.(target.id, target.sent_at);
      }}
      className="rounded-thumb bg-s2 text-muted hover:bg-s3 flex w-full min-w-0 cursor-pointer items-stretch gap-2 overflow-hidden border-0 py-1.5 pr-2.5 pl-0 text-left text-[13px]"
    >
      <span aria-hidden className="bg-accent w-[3px] flex-none rounded-full" />
      <span className="flex min-w-0 flex-col">
        <span className="text-accent text-xs font-bold">{who}</span>
        <span className="flex min-w-0 items-center gap-1.5">
          {Icon && <Icon size={14} aria-hidden className="flex-none" />}
          <span className="truncate">{label}</span>
        </span>
      </span>
    </button>
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
  onDoubleTap,
  meId,
  onRemoveReaction,
  onJumpTo,
  pinned = false,
  pos = "single",
}: {
  /** Tap a quoted reply to scroll to (and highlight) the original. */
  onJumpTo?: (id: string, at: string) => void;
  pinned?: boolean;
  onDoubleTap?: (m: UiMessage) => void;
  pos?: GroupPos;
  m: UiMessage;
  mine: boolean;
  partnerName: string;
  media: Map<string, MediaInfo>;
  reactions: Reaction[];
  replyTarget?: UiMessage;
  onLongPress: (m: UiMessage) => void;
  meId: string;
  onRemoveReaction?: (r: Reaction) => void;
  onSwipeReply: (m: UiMessage) => void;
  onRetry: (m: UiMessage) => void;
}) {
  // One press: where it started, the long-press timer, how far it has moved,
  // and which way it locked (x = swipe to reply, y = the list is scrolling).
  const press = useRef<{
    x: number;
    y: number;
    t: ReturnType<typeof setTimeout> | null;
    dx: number;
    down: boolean;
    axis: "x" | "y" | null;
    armed: boolean;
  }>({ x: 0, y: 0, t: null, dx: 0, down: false, axis: null, armed: false });
  const arrow = useRef<HTMLSpanElement>(null);
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

  const SWIPE = 64;
  const resetSwipe = () => {
    if (el.current) el.current.style.transform = "";
    if (arrow.current) {
      arrow.current.style.opacity = "0";
      arrow.current.style.transform = "translateY(-50%) scale(0.6)";
    }
    press.current.dx = 0;
    press.current.axis = null;
    press.current.armed = false;
    press.current.down = false;
  };
  const handlers = {
    onPointerDown: (e: React.PointerEvent) => {
      press.current.x = e.clientX;
      press.current.y = e.clientY;
      press.current.dx = 0;
      press.current.axis = null;
      press.current.armed = false;
      // Only a primary press can become a long press or a swipe; right-click uses onContextMenu.
      if (e.button !== 0) return;
      press.current.down = true;
      if (press.current.t) clearTimeout(press.current.t);
      press.current.t = setTimeout(() => {
        press.current.t = null;
        onLongPress(m);
      }, 450);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!press.current.down) return;
      const rawX = e.clientX - press.current.x;
      const dy = e.clientY - press.current.y;
      // Lock to the first clear direction: sideways replies, up and down scrolls.
      if (!press.current.axis) {
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(rawX)) press.current.axis = "y";
        else if (rawX > 10 && rawX > Math.abs(dy)) {
          press.current.axis = "x";
          try {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          } catch {
            /* not capturable: fine */
          }
        }
      }
      if (press.current.axis && press.current.t) {
        clearTimeout(press.current.t);
        press.current.t = null;
      }
      if (press.current.axis !== "x") return;
      const dx = Math.max(0, rawX);
      press.current.dx = dx;
      // Follows the finger, then resists past the threshold.
      const shown = dx < SWIPE ? dx : SWIPE + (dx - SWIPE) * 0.25;
      if (el.current) el.current.style.transform = `translateX(${Math.min(shown, 96)}px)`;
      const k = Math.min(dx / SWIPE, 1);
      if (arrow.current) {
        arrow.current.style.opacity = String(k);
        arrow.current.style.transform = `translateY(-50%) scale(${0.6 + k * 0.4})`;
      }
      if (dx >= SWIPE && !press.current.armed) {
        press.current.armed = true;
        haptic("select");
      } else if (dx < SWIPE && press.current.armed) press.current.armed = false;
    },
    onPointerUp: () => {
      if (press.current.t) clearTimeout(press.current.t);
      press.current.t = null;
      if (press.current.axis === "x" && press.current.dx >= SWIPE) onSwipeReply(m);
      resetSwipe();
    },
    onPointerCancel: () => {
      if (press.current.t) clearTimeout(press.current.t);
      press.current.t = null;
      resetSwipe();
    },
    onDoubleClick: () => onDoubleTap?.(m),
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      if (press.current.t) clearTimeout(press.current.t);
      press.current.t = null;
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
    // SAF-02: private media is only ever a covered card in chat; it opens in After Dark.
    return (
      <Link
        href={`/dark/view/${m.media_ids[0]}`}
        className={cn(
          "press rounded-thumb border-line bg-s2 text-text hover:text-text relative flex h-[120px] w-[180px] flex-col items-center justify-center gap-1 overflow-hidden border",
          side,
        )}
        aria-label="Private. Open in After Dark"
      >
        <EyeSlash size={20} className="text-muted" aria-hidden />
        <span className="text-xs font-medium">
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
          "border-line text-faint rounded-card border border-dashed px-3.5 py-2.5 text-sm",
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
          <div className="px-3 pt-2 pb-1.5 text-[length:var(--chat-text,16px)] leading-[1.35] [overflow-wrap:anywhere] whitespace-pre-wrap">
            {m.body}
            <span
              aria-hidden
              className="mono text-faint relative top-[5px] float-right ml-2.5 text-[11px] leading-none"
            >
              {pinned && (
                <PushPin size={11} weight="fill" className="mr-1 inline align-[-1px]" aria-hidden />
              )}
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
          className="px-1 text-[36px] leading-[1.15]"
          style={{ opacity: m.local === "sending" ? 0.7 : 1 }}
        >
          {m.body}
        </div>
      ) : (
        <div
          // flow-root: the bubble grows around the floated time/"edited" stamp, so a stamp
          // that wraps to its own line stays inside instead of hiding under the next bubble.
          className="flow-root w-fit max-w-full px-3.5 pt-2 pb-1.5 text-[length:var(--chat-text,16px)] leading-[1.35] [overflow-wrap:anywhere] whitespace-pre-wrap"
          style={{
            borderRadius: radius(mine, pos),
            // Chat theme (themes.ts bubbleVars): fill, text and edge for both sides.
            background: mine
              ? "var(--bubble-out, var(--surface-3))"
              : "var(--bubble-in, var(--surface-1))",
            color: mine ? "var(--bubble-out-fg, var(--text))" : "var(--bubble-in-fg, var(--text))",
            border: mine
              ? "var(--bubble-out-border, 1px solid transparent)"
              : "var(--bubble-in-border, 1px solid var(--line))",
            opacity: m.local === "sending" ? 0.7 : 1,
          }}
        >
          {replyTarget && (
            <div className="mb-1.5">
              <ReplyQuote
                target={replyTarget}
                targetMine={replyTarget.sender_id === meId}
                who={replyTarget.sender_id === meId ? "You" : partnerName}
                media={media}
                onJump={onJumpTo}
              />
            </div>
          )}
          {m.body}
          <span
            aria-hidden
            className={cn(
              "mono relative top-[5px] float-right ml-2.5 text-[11px] leading-none select-none",
              mine ? "opacity-60" : "text-faint",
            )}
          >
            {pinned && (
              <PushPin size={11} weight="fill" className="mr-1 inline align-[-1px]" aria-hidden />
            )}
            {m.local === "sending" ? "..." : `${m.edited_at ? "edited · " : ""}${clock(m.sent_at)}`}
          </span>
        </div>
      );
  }

  return (
    <div
      data-mid={m.id}
      className={cn(
        "group/msg rounded-ticket relative flex flex-col transition-colors duration-700",
        mine ? "items-end" : "items-start",
        (pos === "middle" || pos === "last") && "-mt-1.5",
        reactions.length > 0 && "mb-3",
      )}
    >
      {/* Shows behind the message as you swipe it right: let go past it to reply. */}
      {!removed && (
        <span
          ref={arrow}
          aria-hidden
          className="bg-s2 text-muted pointer-events-none absolute top-1/2 left-1 flex h-8 w-8 items-center justify-center rounded-full opacity-0"
          style={{ transform: "translateY(-50%) scale(0.6)" }}
        >
          <ArrowBendUpLeft size={16} weight="bold" />
        </span>
      )}
      <div
        ref={el}
        role="button"
        tabIndex={0}
        aria-label={`${mine ? "You" : partnerName}: ${m.type === "text" ? m.body : m.type}.${pinned ? " Pinned." : ""} Press for reactions.`}
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
              targetMine={replyTarget.sender_id === meId}
              who={replyTarget.sender_id === meId ? "You" : partnerName}
              media={media}
              onJump={onJumpTo}
            />
          </div>
        )}
        <div className="relative max-w-[80%] md:max-w-[min(80%,560px)]">
          {content}
          {/* Mouse and trackpad: hover a message for a reply button beside it. */}
          {!removed && !m.local && (
            <button
              type="button"
              aria-label={`Reply to ${mine ? "your" : `${partnerName}'s`} message`}
              title="Reply"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onSwipeReply(m);
              }}
              className={cn(
                "bg-s2 text-muted hover:text-text hover:bg-s3 absolute top-1/2 hidden h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-0 opacity-0 transition-opacity duration-150 group-focus-within/msg:opacity-100 group-hover/msg:opacity-100 focus-visible:opacity-100 [@media(hover:hover)_and_(pointer:fine)]:flex",
                mine ? "right-full mr-2" : "left-full ml-2",
              )}
            >
              <ArrowBendUpLeft size={16} weight="bold" aria-hidden />
            </button>
          )}
          <ReactionPill
            reactions={reactions}
            meId={meId}
            onTapOwn={(r) => onRemoveReaction?.(r)}
            onTapOther={() => onLongPress(m)}
          />
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

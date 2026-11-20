"use client";
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneX, VideoCamera } from "@phosphor-icons/react";
import { cn } from "@/components/ui/cn";
import { useCall } from "./call-provider";
import { callLogReason } from "./call-reasons";

export function parseCallBody(body: string | null) {
  if (!body?.startsWith("call:")) return null;
  const [, outcome, kind, secs, reason] = body.split(":");
  return {
    outcome: outcome ?? "ended",
    video: kind === "video",
    seconds: Number(secs ?? 0),
    reason: reason ?? null,
  };
}

const dur = (s: number) =>
  s >= 3600
    ? `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min`
    : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** A call in the chat history, WhatsApp style, with one-tap call back. */
export function CallLogRow({
  body,
  mine,
  partnerName,
  at,
}: {
  body: string;
  mine: boolean;
  partnerName: string;
  at: string;
}) {
  const { start } = useCall();
  const c = parseCallBody(body)!;
  const missed = c.outcome !== "ended";
  const why = callLogReason(c.reason, mine, partnerName);
  const time = new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const kind = c.video ? "video call" : "voice call";
  const title =
    c.outcome === "ended"
      ? `${c.video ? "Video" : "Voice"} call`
      : mine
        ? c.outcome === "declined"
          ? `${partnerName} couldn't pick up`
          : c.outcome === "failed"
            ? "Call didn't connect"
            : "No answer"
        : `Missed ${kind}`;
  const Icon = missed ? (mine ? PhoneX : PhoneIncoming) : mine ? PhoneOutgoing : PhoneIncoming;
  return (
    <div
      className={cn(
        "bg-s1 border-line rounded-card flex w-[min(78vw,300px)] items-center gap-3 border py-2.5 pr-2 pl-3",
        mine ? "self-end" : "self-start",
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 flex-none items-center justify-center rounded-full",
          missed && !mine ? "bg-danger/15 text-danger" : "bg-s3 text-text",
        )}
      >
        <Icon size={20} weight="fill" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn("block truncate text-[15px] font-bold", missed && !mine && "text-danger")}
        >
          {title}
        </span>
        <span className="mono text-faint block text-xs">
          {time}
          {c.outcome === "ended" && ` · ${dur(c.seconds)}`}
        </span>
        {why && <span className="text-muted block truncate text-xs">{why}</span>}
      </span>
      <button
        type="button"
        onClick={() => start(c.video)}
        aria-label={`Call ${partnerName} back`}
        className="press bg-accent/15 text-accent flex h-11 flex-none cursor-pointer items-center gap-1.5 rounded-full border-0 px-3 text-sm font-bold"
      >
        {c.video ? (
          <VideoCamera size={20} weight="fill" aria-hidden />
        ) : (
          <Phone size={20} weight="fill" aria-hidden />
        )}
        Call
      </button>
    </div>
  );
}

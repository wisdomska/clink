"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { Phone, PhoneIncoming, VideoCamera, X } from "@phosphor-icons/react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useCouple, useCoupleEvent } from "@/features/couple/context";
import { parseCallBody } from "./call-log-row";
import { useCall } from "./call-provider";

const KEY = "clink.missedSeen";
const seenId = () => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

/**
 * "Missed call from Theo" at the top of Us and Chat, until you call back or
 * dismiss it. Only the newest call counts, so calling back clears it.
 */
export function MissedCallCard() {
  const { me, partner, coupleId } = useCouple();
  const { start, call } = useCall();
  const [dismissed, setDismissed] = useState<string | null>(seenId);
  const { data, refetch } = useQuery({
    queryKey: ["last-call", coupleId],
    queryFn: async () => {
      const { data } = await supabaseBrowser()
        .from("messages")
        .select("id, sender_id, body, sent_at")
        .eq("type", "system")
        .like("body", "call:%")
        .order("sent_at", { ascending: false })
        .limit(1);
      const last = data?.[0];
      return last
        ? { ...last, fresh: Date.now() - new Date(last.sent_at).getTime() < 48 * 3600 * 1000 }
        : null;
    },
    refetchInterval: 60_000,
  });
  useCoupleEvent("call:end", () => setTimeout(() => void refetch(), 1500));

  const c = data ? parseCallBody(data.body) : null;
  const fresh = data?.fresh;
  const show =
    data &&
    c &&
    fresh &&
    !call &&
    data.sender_id !== me.id &&
    c.outcome === "missed" &&
    dismissed !== data.id;

  const hide = () => {
    if (!data) return;
    try {
      localStorage.setItem(KEY, data.id);
    } catch {
      /* fine */
    }
    setDismissed(data.id);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: -10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -10, height: 0 }}
          className="flex-none overflow-hidden"
        >
          <div className="bg-danger/12 flex items-center gap-3 rounded-[22px] p-2.5 pl-3">
            <span className="bg-danger/20 text-danger flex h-10 w-10 flex-none items-center justify-center rounded-full">
              <PhoneIncoming size={20} weight="fill" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-bold">
                Missed {c!.video ? "video " : ""}call from {partner.name}
              </span>
              <span className="mono text-faint text-xs">
                {new Date(data!.sent_at).toLocaleString([], {
                  weekday: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </span>
            <button
              type="button"
              onClick={() => {
                hide();
                start(c!.video);
              }}
              className="press bg-accent text-on-accent flex h-10 cursor-pointer items-center gap-1.5 rounded-full border-0 px-3.5 text-sm font-bold"
            >
              {c!.video ? (
                <VideoCamera size={18} weight="fill" />
              ) : (
                <Phone size={18} weight="fill" />
              )}
              Call back
            </button>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={hide}
              className="text-faint hover:text-text flex h-10 w-8 cursor-pointer items-center justify-center border-0 bg-transparent"
            >
              <X size={18} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

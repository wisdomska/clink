"use client";
import { useEffect } from "react";
import { useCouple } from "@/features/couple/context";
import { supabaseBrowser } from "@/lib/supabase/client";
import { subscribeAuthed } from "@/lib/realtime";
import { playMessageTone } from "@/lib/tones";

const AUDIBLE = new Set(["text", "voice", "media", "sticker"]);

/** Plays the message tone when your partner's message arrives while the app is open. */
export function MessageTone() {
  const { coupleId, me } = useCouple();
  useEffect(() => {
    if (!coupleId) return;
    const ch = supabaseBrowser()
      .channel(`msgtone:${coupleId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `couple_id=eq.${coupleId}`,
        },
        (payload) => {
          const m = payload.new as { sender_id: string; type: string };
          if (
            m.sender_id !== me.id &&
            AUDIBLE.has(m.type) &&
            document.visibilityState === "visible"
          )
            playMessageTone();
        },
      );
    return subscribeAuthed(ch);
  }, [coupleId, me.id]);
  return null;
}

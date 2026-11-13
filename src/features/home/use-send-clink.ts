"use client";
import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCouple } from "@/features/couple/context";
import { toast } from "@/components/ui/toast";
import { vibrate } from "./clink-store";

/** Sends a Clink: broadcast first (sub-second for an online partner), then persist + push. */
export function useSendClink() {
  const { send, partner, presence } = useCouple();
  const qc = useQueryClient();
  const [clinking, setClinking] = useState(false);

  const sendClink = useCallback(
    async (kind: "tap" | "back" = "tap") => {
      if (clinking) return;
      setClinking(true);
      vibrate([30, 60, 30]);
      send("clink.sent", { kind });
      const online = presence.online;
      fetch("/api/clinks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, partnerOnline: online }),
      })
        .then(() => qc.invalidateQueries({ queryKey: ["streak"] }))
        .catch(() => toast("That Clink didn't save. It still reached them if they're online."));
      setTimeout(() => {
        setClinking(false);
        toast(online ? `Clink sent. ${partner.name} felt that.` : `Clink sent. ${partner.name} gets it as a push.`);
      }, 950);
    },
    [clinking, send, presence.online, partner.name, qc],
  );

  return { sendClink, clinking };
}

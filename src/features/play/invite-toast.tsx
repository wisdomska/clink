"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { GameController } from "@phosphor-icons/react";
import { useCouple, useCoupleEvent } from "@/features/couple/context";
import { Button } from "@/components/ui/button";
import { GAME_META } from "./meta";
import type { GameType } from "./engines/types";

/** App-wide game invite (prototype "Invite pending"). The lobby shows its own list. */
export function GameInviteToast() {
  const { partner } = useCouple();
  const router = useRouter();
  const path = usePathname();
  const [invite, setInvite] = useState<{ id: string; type: GameType } | null>(null);

  useCoupleEvent("game.invite", (p) => {
    const type = p.type as GameType;
    if (typeof p.id === "string" && type in GAME_META) setInvite({ id: p.id, type });
  });

  if (!invite || path.startsWith("/play")) return null;
  const name = GAME_META[invite.type].name;
  return (
    <div
      role="alertdialog"
      aria-labelledby="invite-title"
      className="an-slide-down rounded-card border-line bg-s1 fixed top-[calc(env(safe-area-inset-top)+8px)] right-3 left-3 z-[31] mx-auto flex max-w-[420px] items-center gap-3 border p-4 shadow-[var(--shadow-toast)] lg:left-[calc(var(--rail-w)+12px)]"
    >
      <span className="bg-accent text-on-accent flex h-11 w-11 flex-none items-center justify-center rounded-full">
        <GameController size={22} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div id="invite-title" className="text-base font-bold">
          {partner.name} wants to play
        </div>
        <div className="text-muted truncate text-sm">{name}</div>
      </div>
      <Button size="sm" variant="ghost" onClick={() => setInvite(null)}>
        Later
      </Button>
      <Button
        size="sm"
        onClick={async () => {
          const { id, type } = invite;
          setInvite(null);
          await fetch(`/api/games/${id}/join`, { method: "POST" });
          router.push(`/play/${type}/${id}`);
        }}
      >
        Join
      </Button>
    </div>
  );
}

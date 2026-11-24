"use client";
import { useState } from "react";
import { Question } from "@phosphor-icons/react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { GAME_META } from "../meta";
import { RULES } from "../board-copy";
import type { BoardType } from "../engines/boards";

/** A plain-language rules sheet for a board game. */
export function HowToPlay({ kind }: { kind: BoardType }) {
  const [open, setOpen] = useState(false);
  const r = RULES[kind];
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Question size={16} aria-hidden /> How to play
      </Button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title={`How to play ${GAME_META[kind].name}`}
        handle
      >
        <div className="flex flex-col gap-3 pb-2">
          {/* The dialog's own title is for screen readers; this is the one you see. */}
          <div className="display text-2xl leading-tight" aria-hidden>
            How to play {GAME_META[kind].name}
          </div>
          <p className="text-muted m-0 text-base">{r.intro}</p>
          <ol className="marker:text-accent m-0 flex list-decimal flex-col gap-2.5 pl-5 text-base leading-snug">
            {r.rules.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ol>
          <Button onClick={() => setOpen(false)}>Got it</Button>
        </div>
      </Sheet>
    </>
  );
}

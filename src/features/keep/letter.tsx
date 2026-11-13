"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react";
import { useCouple } from "@/features/couple/context";
import { Button, IconButton } from "@/components/ui/button";
import { Mono } from "@/components/ui/heading";
import { tagDate } from "./data";

interface Letter {
  id: string;
  author_id: string;
  condition: string;
  body: string;
  sealed_at: string;
  opened_at: string | null;
}

/** KEEP-01: sealed, breaking the seal (tap or drag), opened. */
export function LetterScreen({ letter }: { letter: Letter }) {
  const router = useRouter();
  const { me, partner } = useCouple();
  const mine = letter.author_id === me.id;
  const [state, setState] = useState<"sealed" | "breaking" | "opened">(letter.opened_at || mine ? "opened" : "sealed");
  const drag = useRef<{ x: number; y: number } | null>(null);
  const initials = `${me.role === "a" ? me.name[0] : partner.name[0]}&${me.role === "a" ? partner.name[0] : me.name[0]}`.toUpperCase();
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [condHead, ...condTail] = letter.condition.split(" ");
  const last = condTail.pop() ?? "";

  async function breakSeal() {
    if (state !== "sealed") return;
    setState("breaking");
    navigator.vibrate?.(40);
    void fetch(`/api/letters/${letter.id}/open`, { method: "POST" });
    setTimeout(() => setState("opened"), reduced ? 200 : 800);
  }

  return (
    <div className="screen an-screen flex max-w-[640px] flex-col gap-5">
      <IconButton label="Back" onClick={() => router.push("/keep")}>
        <ArrowLeft size={20} />
      </IconButton>
      <div>
        <Mono>
          {mine ? "FROM YOU" : `FROM ${partner.name.toUpperCase()}`} · SEALED {tagDate(letter.sealed_at)}
        </Mono>
        <h1 className="display mt-1.5 mb-0 text-[36px] leading-[1.05]">
          {condHead} {condTail.join(" ")} <em>{last}</em>
        </h1>
      </div>
      {state !== "opened" ? (
        <>
          <div className="relative mt-3 aspect-[3/2] w-full flex-none overflow-hidden rounded-ticket border border-line bg-s2" style={{ perspective: 600 }}>
            <div className="absolute inset-0 bg-s3" style={{ clipPath: "polygon(0 0,100% 0,50% 60%)" }} />
            {state === "sealed" ? (
              <button
                type="button"
                onClick={breakSeal}
                onPointerDown={(e) => {
                  drag.current = { x: e.clientX, y: e.clientY };
                  (e.target as Element).setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => {
                  if (!drag.current) return;
                  const d = Math.hypot(e.clientX - drag.current.x, e.clientY - drag.current.y);
                  (e.currentTarget as HTMLElement).style.transform = `translate(${(e.clientX - drag.current.x) * 0.3}px, ${(e.clientY - drag.current.y) * 0.3}px)`;
                  if (d > 60) {
                    drag.current = null;
                    void breakSeal();
                  }
                }}
                onPointerUp={(e) => {
                  drag.current = null;
                  (e.currentTarget as HTMLElement).style.transform = "";
                }}
                aria-label="Break the seal"
                className="display absolute top-[60%] left-1/2 -mt-[38px] -ml-[38px] flex h-[76px] w-[76px] cursor-grab touch-none items-center justify-center rounded-full border-0 bg-accent text-xl tracking-normal text-on-accent"
                style={{ boxShadow: "0 0 0 6px var(--accent-halo)" }}
              >
                {initials}
              </button>
            ) : (
              <>
                <div className="an-sealL absolute top-[60%] left-1/2 -mt-[38px] -ml-[38px] h-[76px] w-[76px] rounded-full bg-accent" style={{ clipPath: "polygon(0 0,52% 0,44% 50%,54% 100%,0 100%)" }} />
                <div className="an-sealR absolute top-[60%] left-1/2 -mt-[38px] -ml-[38px] h-[76px] w-[76px] rounded-full bg-accent" style={{ clipPath: "polygon(52% 0,100% 0,100% 100%,54% 100%,44% 50%)" }} />
              </>
            )}
          </div>
          <p className="m-0 text-center text-base text-muted">Tap or drag the seal to break it. {partner.name} gets a little note that you did.</p>
        </>
      ) : (
        <>
          <div className="an-letter flex flex-col gap-3.5 rounded-card bg-text px-[22px] py-6 text-on-accent" style={{ transform: "rotate(-1deg)" }}>
            {letter.body.split(/\n{2,}/).map((p, i) => (
              <p key={i} className="m-0 text-lg leading-[1.55] whitespace-pre-wrap">
                {p}
              </p>
            ))}
            <p className="display m-0 text-[22px] tracking-normal">{(mine ? me.name : partner.name)[0]}.</p>
          </div>
          {!mine && (
            <div className="flex flex-wrap gap-2">
              <Button size="md" onClick={() => router.push("/chat?voice=1")}>
                Reply with a voice note
              </Button>
              <Button size="md" variant="ghost" onClick={() => router.push("/keep")}>
                Keep it
              </Button>
            </div>
          )}
          {mine && <p className="m-0 text-sm text-muted">{letter.opened_at ? `${partner.name} opened this ${tagDate(letter.opened_at).toLowerCase()}.` : `Still sealed. ${partner.name} hasn't needed it yet.`}</p>}
        </>
      )}
    </div>
  );
}

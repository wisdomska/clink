"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Play } from "@phosphor-icons/react";
import { useCouple } from "@/features/couple/context";
import { Button, IconButton } from "@/components/ui/button";
import { Mono } from "@/components/ui/heading";
import { countdownParts } from "@/lib/time";
import { Bottle } from "./objects";
import { tagDate } from "./data";

interface Capsule {
  id: string;
  title: string;
  unlock_at: string;
  opened_at: string | null;
  created_at: string;
  author_id: string;
}

/** KEEP-02: locked with countdown, ready, uncorking, opened (contents fetched from the server only now). */
export function CapsuleScreen({ capsule }: { capsule: Capsule }) {
  const router = useRouter();
  const { me, partner } = useCouple();
  const [now, setNow] = useState(() => new Date());
  const ready = new Date(capsule.unlock_at) <= now;
  const [state, setState] = useState<"corked" | "uncorking" | "open">(capsule.opened_at ? "open" : "corked");
  const [content, setContent] = useState<{ body: string | null; media: { id: string; kind: string; duration_s: number | null } | null } | null>(null);
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (state !== "open") return;
    void fetch(`/api/capsules/${capsule.id}`).then(async (r) => r.ok && setContent(await r.json()));
  }, [state, capsule.id]);

  const p = countdownParts(now, new Date(capsule.unlock_at));
  const words = capsule.title.split(" ");
  const tail = words.pop();
  return (
    <div className="screen an-screen flex max-w-[640px] flex-col gap-5">
      <IconButton label="Back" onClick={() => router.push("/keep")}>
        <ArrowLeft size={20} />
      </IconButton>
      <h1 className="display m-0 text-[36px] leading-[1.05]">
        {words.join(" ")} <em>{tail}</em>
      </h1>
      {!ready && <p className="-mt-2 mb-0 text-base text-muted">Neither of you can open it early. That&apos;s the point.</p>}
      <div className="relative flex flex-none justify-center pt-6">
        <Bottle ready={ready} tag={tagDate(capsule.unlock_at)} size="lg" corked={state !== "open"} uncorking={state === "uncorking"} />
      </div>
      {!ready ? (
        <div className="mono text-center text-[36px]" role="timer" aria-label={`${p.days} days ${p.hours} hours ${p.minutes} minutes to go`}>
          {p.days}d {String(p.hours).padStart(2, "0")}h {String(p.minutes).padStart(2, "0")}m
        </div>
      ) : state === "corked" ? (
        <Button
          onClick={() => {
            setState("uncorking");
            navigator.vibrate?.(30);
            void fetch(`/api/capsules/${capsule.id}/open`, { method: "POST" });
            setTimeout(() => setState("open"), reduced ? 200 : 900);
          }}
        >
          Uncork it
        </Button>
      ) : state === "open" ? (
        <div className="an-letter flex flex-col gap-3 rounded-card border border-line bg-s1 p-[18px]">
          <Mono>
            FROM {capsule.author_id === me.id ? "YOU" : partner.name.toUpperCase()} · {tagDate(capsule.created_at)}
          </Mono>
          {content ? (
            <>
              {content.body && <p className="m-0 text-base leading-normal whitespace-pre-wrap">{content.body}</p>}
              {content.media?.kind === "image" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/media/${content.media.id}/view`} alt="From the capsule" className="w-full rounded-thumb" />
              )}
              {content.media?.kind === "audio" && (
                <div className="flex items-center gap-2.5 rounded-input bg-s2 p-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-on-accent">
                    <Play size={14} weight="fill" aria-hidden />
                  </span>
                  <audio controls src={`/api/media/${content.media.id}/view`} className="h-8 flex-1" />
                </div>
              )}
            </>
          ) : (
            <div className="an-skel h-16 rounded-input bg-s2" />
          )}
        </div>
      ) : null}
    </div>
  );
}

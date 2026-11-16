"use client";
import { feedback } from "@/lib/feedback";
import { useEffect, useState } from "react";
import { Play } from "@phosphor-icons/react";
import { useCouple } from "@/features/couple/context";
import { Button } from "@/components/ui/button";
import { Mono } from "@/components/ui/heading";
import { countdownParts } from "@/lib/time";
import { Bottle } from "./objects";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { editList, rollback } from "@/features/plans/infinite";
import { capsulesKey, tagDate, type CapsuleRow } from "./data";
import { PageBar } from "@/components/clink/page-bar";

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
  const { me, partner, coupleId } = useCouple();
  const qc = useQueryClient();
  const [now, setNow] = useState(() => new Date());
  const ready = new Date(capsule.unlock_at) <= now;
  const [state, setState] = useState<"corked" | "uncorking" | "open">(
    capsule.opened_at ? "open" : "corked",
  );
  const [content, setContent] = useState<{
    body: string | null;
    media: { id: string; kind: string; duration_s: number | null } | null;
  } | null>(null);
  const reduced =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (state !== "open") return;
    void fetch(`/api/capsules/${capsule.id}`).then(async (r) => r.ok && setContent(await r.json()));
  }, [state, capsule.id]);

  const p = countdownParts(now, new Date(capsule.unlock_at));
  return (
    <div className="screen an-screen flex max-w-[640px] flex-col gap-5">
      <PageBar title={capsule.title} back="/keep" />
      {!ready && (
        <p className="text-muted -mt-2 mb-0 text-base">
          Neither of you can open it early. That&apos;s the point.
        </p>
      )}
      <div className="relative flex flex-none justify-center pt-6">
        <Bottle
          ready={ready}
          tag={tagDate(capsule.unlock_at)}
          size="lg"
          corked={state !== "open"}
          uncorking={state === "uncorking"}
        />
      </div>
      {!ready ? (
        <div
          className="mono text-center text-[36px]"
          role="timer"
          aria-label={`${p.days} ${p.days === 1 ? "day" : "days"}, ${p.hours} ${p.hours === 1 ? "hour" : "hours"} and ${p.minutes} ${p.minutes === 1 ? "minute" : "minutes"} to go`}
        >
          {p.days}d {String(p.hours).padStart(2, "0")}h {String(p.minutes).padStart(2, "0")}m
        </div>
      ) : state === "corked" ? (
        <Button
          onClick={async () => {
            // Optimistic: uncork now, mark it opened on the shelf, roll back on failure.
            setState("uncorking");
            feedback("success", "pop");
            const key = capsulesKey(coupleId);
            const openedAt = new Date().toISOString();
            const snap = await editList<CapsuleRow>(qc, key, (items) =>
              items.map((c) => (c.id === capsule.id ? { ...c, opened_at: openedAt } : c)),
            );
            const timer = setTimeout(() => setState("open"), reduced ? 200 : 900);
            const r = await fetch(`/api/capsules/${capsule.id}/open`, { method: "POST" }).catch(
              () => null,
            );
            if (!r?.ok) {
              clearTimeout(timer);
              rollback(qc, key, snap);
              setState("corked");
              toast.err("Couldn't uncork it. Try again.");
            }
          }}
        >
          Uncork it
        </Button>
      ) : state === "open" ? (
        <div className="an-letter rounded-card border-line bg-s1 flex flex-col gap-3 border p-[18px]">
          <Mono>
            From {capsule.author_id === me.id ? "you" : partner.name} ·{" "}
            {tagDate(capsule.created_at)}
          </Mono>
          {content ? (
            <>
              {content.body && (
                <p className="m-0 text-base leading-normal whitespace-pre-wrap">{content.body}</p>
              )}
              {content.media?.kind === "image" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/media/${content.media.id}/view`}
                  alt="From the capsule"
                  className="rounded-thumb w-full"
                />
              )}
              {content.media?.kind === "video" && (
                <video
                  controls
                  playsInline
                  src={`/api/media/${content.media.id}/view`}
                  className="rounded-thumb w-full"
                />
              )}
              {content.media?.kind === "audio" && (
                <div className="rounded-input bg-s2 flex items-center gap-2.5 p-2.5">
                  <span className="bg-accent text-on-accent flex h-8 w-8 items-center justify-center rounded-full">
                    <Play size={14} weight="fill" aria-hidden />
                  </span>
                  <audio
                    controls
                    src={`/api/media/${content.media.id}/view`}
                    className="h-8 flex-1"
                  />
                </div>
              )}
            </>
          ) : (
            <div className="an-skel rounded-input bg-s2 h-16" />
          )}
        </div>
      ) : null}
    </div>
  );
}

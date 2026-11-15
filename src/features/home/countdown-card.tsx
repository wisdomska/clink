"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useCouple } from "@/features/couple/context";
import { countdownParts } from "@/lib/time";
import { SplitFlap, EmptyBoard } from "./split-flap";

export function useCountdowns() {
  const { coupleId } = useCouple();
  return useQuery({
    queryKey: ["countdowns", coupleId],
    queryFn: async () => {
      const { data } = await supabaseBrowser()
        .from("countdowns_public")
        .select("*")
        .order("target_at", { ascending: true });
      return data ?? [];
    },
  });
}

export function formatTarget(iso: string, tz: string, city: string) {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: tz,
  }).format(d);
  const t = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: tz,
  }).format(d);
  return `${day.replace(",", "")}, ${t} ${city} time`;
}

/** HOME-07 on Us: the next countdown on a split-flap board, or the empty board. */
export function CountdownCard({ now }: { now: Date }) {
  const { me } = useCouple();
  const { data, isLoading } = useCountdowns();
  const upcoming = (data ?? []).filter(
    (c) => new Date(c.target_at!) > new Date(now.getTime() - 24 * 3600 * 1000),
  );
  const next = upcoming[0];
  const parts = next ? countdownParts(now, new Date(next.target_at!)) : null;
  const pad = (n: number) => String(Math.min(n, 99)).padStart(2, "0");

  return (
    <section
      aria-labelledby="cd-h"
      className="border-line bg-s1 flex flex-none flex-col gap-3.5 rounded-[28px] border p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="cd-h" className="m-0 text-lg font-bold">
          <Link href="/us/countdowns" className="text-text hover:text-text">
            {next?.title ?? "Next visit"}
          </Link>
        </h2>
        {next?.subtitle && (
          <div className="mono text-muted truncate text-xs tracking-[.06em] uppercase">
            {next.subtitle}
          </div>
        )}
      </div>
      {isLoading ? (
        <div className="an-skel rounded-flap bg-s2 h-[78px]" />
      ) : next && parts ? (
        parts.done ? (
          <div className="an-reveal flex flex-col gap-2">
            <SplitFlap
              groups={[
                { value: "00", label: "DAYS" },
                { value: "00", label: "HRS" },
                { value: "00", label: "MIN" },
              ]}
            />
            {next.reveal_note ? (
              <p className="rounded-input bg-s2 m-0 p-3 text-base leading-normal">
                {next.reveal_note}
              </p>
            ) : (
              <p className="text-muted m-0 text-sm">It&apos;s here. Go hug them.</p>
            )}
          </div>
        ) : (
          <>
            <SplitFlap
              groups={[
                { value: pad(parts.days), label: "DAYS" },
                { value: pad(parts.hours), label: "HRS" },
                { value: pad(parts.minutes), label: "MIN" },
              ]}
            />
            <div className="text-muted text-sm">
              {formatTarget(next.target_at!, me.timezone, me.city || "your")}.
              {next.has_note ? " A note flips over at zero." : ""}
            </div>
          </>
        )
      ) : (
        <>
          <EmptyBoard />
          <p className="text-muted m-0 text-base leading-[1.45]">
            Nothing on the board yet. Add your next visit and we&apos;ll start the flip.
          </p>
          <Link
            href="/us/countdowns?new=1"
            className="press border-line bg-s2 text-text hover:text-text flex h-11 items-center self-start rounded-full border px-[18px] text-sm font-medium"
          >
            Add a countdown
          </Link>
        </>
      )}
    </section>
  );
}

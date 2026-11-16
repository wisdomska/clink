"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash } from "@phosphor-icons/react";
import { useCouple } from "@/features/couple/context";
import { Button, IconButton } from "@/components/ui/button";
import { Display, Mono } from "@/components/ui/heading";
import { supabaseBrowser } from "@/lib/supabase/client";
import {
  LoadMore,
  deleteWithUndo,
  editList,
  flatItems,
  rollback,
  useScrollRestore,
} from "@/features/plans/infinite";
import { useTimeline, timelineKey, tagDate, type TimelineRow } from "./data";
import { nextAnniversary } from "@/lib/milestones";

/** KEEP-03 full timeline: auto milestones plus manual entries with photos. */
function ordinal(n: number) {
  const words = [
    "",
    "First",
    "Second",
    "Third",
    "Fourth",
    "Fifth",
    "Sixth",
    "Seventh",
    "Eighth",
    "Ninth",
    "Tenth",
  ];
  if (words[n]) return words[n]!;
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th");
  return `${n}${s}`;
}

/** Skeleton entries shaped like the real ones: a dot, a date tag and a title. */
function TimelineSkeleton({ count = 4 }: { count?: number }) {
  return (
    <ol aria-hidden className="border-line m-0 ml-1.5 flex list-none flex-col border-l-[1.5px] p-0">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="relative pb-6 pl-5">
          <span className="border-line bg-app absolute top-1 -left-1.5 h-2.5 w-2.5 rounded-full border-[1.5px]" />
          <div className="an-skel bg-s2 h-3 w-32 rounded-full" />
          <div className="an-skel bg-s2 mt-2 h-4 w-3/5 rounded-full" />
        </li>
      ))}
    </ol>
  );
}

export function TimelineScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { me, coupleId, linkedAt, startedOn } = useCouple();
  const q = useTimeline();
  const entries = flatItems(q.data);
  useScrollRestore("keep-timeline", q.isSuccess);
  const [now] = useState(() => Date.now());
  const days = Math.floor((now - new Date(startedOn ?? linkedAt).getTime()) / 86400000);
  const anniversary = startedOn
    ? nextAnniversary(startedOn, new Date(now).toISOString().slice(0, 10))
    : null;

  async function remove(t: TimelineRow) {
    const key = timelineKey(coupleId);
    const snap = await editList<TimelineRow>(qc, key, (items) =>
      items.filter((x) => x.id !== t.id),
    );
    deleteWithUndo({
      message: "Removed from the timeline.",
      restore: () => rollback(qc, key, snap),
      commit: async () => {
        const { error } = await supabaseBrowser().from("timeline_entries").delete().eq("id", t.id);
        if (error) throw error;
        void qc.invalidateQueries({ queryKey: ["keep", coupleId] });
      },
    });
  }

  return (
    <div className="screen an-screen flex max-w-[720px] flex-col gap-5">
      <IconButton label="Back" onClick={() => router.push("/keep")}>
        <ArrowLeft size={20} />
      </IconButton>
      <div>
        <Display size={48}>Timeline</Display>
        <p className="text-muted m-0 mt-1 text-sm">
          Day {days.toLocaleString("en-GB")} {startedOn ? "together" : "on Clink"}
        </p>
        {anniversary && (
          <p className="text-muted m-0 mt-1 text-sm">
            {anniversary.inDays === 0
              ? "Happy anniversary."
              : `${ordinal(anniversary.years)} anniversary in ${anniversary.inDays} ${anniversary.inDays === 1 ? "day" : "days"}.`}
          </p>
        )}
      </div>
      {q.isPending ? (
        <TimelineSkeleton />
      ) : q.isError && !entries.length ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-muted m-0 text-base">Couldn&apos;t load the timeline.</p>
          <Button size="sm" variant="ghost" onClick={() => void q.refetch()}>
            Try again
          </Button>
        </div>
      ) : entries.length ? (
        <>
          <ol className="border-line m-0 ml-1.5 flex list-none flex-col border-l-[1.5px] p-0">
            {entries.map((t, i) => (
              <li
                key={t.id}
                className="an-rise relative pb-6 pl-5"
                style={{ ["--i" as string]: Math.min(i % 20, 10) }}
              >
                <span
                  aria-hidden
                  className="border-accent bg-app absolute top-1 -left-1.5 h-2.5 w-2.5 rounded-full border-[1.5px]"
                />
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <Mono>
                      {tagDate(`${t.happened_on}T12:00:00Z`)} ·{" "}
                      {t.kind === "auto" ? "AUTO" : "ADDED"}
                    </Mono>
                    <div className="mt-0.5 text-base font-medium">{t.title}</div>
                  </div>
                  {t.kind === "manual" && t.created_by === me.id && (
                    <IconButton
                      label={`Remove ${t.title}`}
                      className="text-muted -mt-2.5 border-0"
                      onClick={() => void remove(t)}
                    >
                      <Trash size={18} />
                    </IconButton>
                  )}
                </div>
                {t.media_id && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/media/${t.media_id}/view`}
                    alt=""
                    loading="lazy"
                    className="rounded-thumb mt-2 max-h-56 object-cover"
                  />
                )}
              </li>
            ))}
          </ol>
          <LoadMore query={q} skeleton={<TimelineSkeleton count={3} />} />
        </>
      ) : (
        <div className="rounded-card border-line flex flex-col items-start gap-3 border border-dashed p-5">
          <div className="display text-[28px] leading-[1.05]">Nothing on the timeline yet.</div>
          <p className="text-muted m-0 text-base">
            Add a moment you want to keep. Dates you finish land here on their own.
          </p>
          <Button size="sm" onClick={() => router.push("/keep?write=moment")}>
            <Plus size={18} aria-hidden /> Add a moment
          </Button>
        </div>
      )}
    </div>
  );
}

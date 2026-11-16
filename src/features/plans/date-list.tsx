"use client";
import Link from "next/link";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { X } from "@phosphor-icons/react";
import { useCouple } from "@/features/couple/context";
import { IconButton } from "@/components/ui/button";
import { Mono } from "@/components/ui/heading";
import { wallTime } from "@/lib/time";
import { LoadMore, SkeletonRows, deleteWithUndo, editList, flatItems, rollback } from "./infinite";
import { dateListKey, upcomingKey, useDateList, type DateRow } from "./data";

const STATUS: Record<string, string> = {
  scheduled: "Booked",
  in_progress: "Under way",
  completed: "Done",
};

/** DATE-02: every date you've booked or done, latest first, with cancel and undo. */
export function DateList() {
  const { me, coupleId } = useCouple();
  const qc = useQueryClient();
  const q = useDateList();
  const dates = flatItems(q.data);
  const [now] = useState(() => Date.now());

  async function cancel(d: DateRow) {
    const listKey = dateListKey(coupleId);
    const nextKey = upcomingKey(coupleId);
    await qc.cancelQueries({ queryKey: nextKey, exact: true });
    const upcoming = qc.getQueryData<DateRow[]>(nextKey);
    if (upcoming)
      qc.setQueryData(
        nextKey,
        upcoming.filter((x) => x.id !== d.id),
      );
    const snap = await editList<DateRow>(qc, listKey, (items) =>
      items.filter((x) => x.id !== d.id),
    );
    const title = d.date_kits?.title ?? "Date";
    deleteWithUndo({
      message: `${title} cancelled.`,
      failMessage: `Couldn't cancel ${title}. It's still booked.`,
      restore: () => {
        rollback(qc, listKey, snap);
        if (upcoming) qc.setQueryData(nextKey, upcoming);
      },
      commit: async () => {
        const r = await fetch(`/api/dates/${d.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "cancelled" }),
        });
        if (!r.ok) throw new Error("cancel failed");
        void qc.invalidateQueries({ queryKey: nextKey });
      },
    });
  }

  // The booth above is the empty state; this list only appears once there's history.
  if (q.isPending) return <SkeletonRows count={2} />;
  if (!dates.length) return null;

  return (
    <section className="flex flex-col gap-3" aria-labelledby="dates-h">
      <h2 id="dates-h" className="m-0 text-lg font-bold">
        Your dates
      </h2>
      <ul className="rounded-card border-line bg-s1 divide-line m-0 flex list-none flex-col divide-y overflow-hidden border p-0">
        {dates.map((d) => {
          const title = d.date_kits?.title ?? "Date night";
          const at = new Date(d.start_at);
          const cancellable = d.status === "scheduled" && at.getTime() > now;
          return (
            <li key={d.id} className="flex min-h-14 items-center gap-2 pr-1.5">
              <Link
                href={`/plans/kits/${d.kit_id}`}
                className="press text-text hover:text-text hover:bg-s2 flex min-h-14 min-w-0 flex-1 items-center gap-3 px-4 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-bold">{title}</div>
                  <Mono className="text-muted">
                    {new Intl.DateTimeFormat("en-GB", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      timeZone: me.timezone,
                    })
                      .format(at)
                      .replace(",", "")}{" "}
                    · {wallTime(at, me.timezone)}
                  </Mono>
                </div>
                <span
                  className={
                    d.status === "completed"
                      ? "text-muted text-sm font-medium"
                      : "text-accent text-sm font-bold"
                  }
                >
                  {STATUS[d.status] ?? d.status}
                </span>
              </Link>
              {cancellable && (
                <IconButton
                  label={`Cancel ${title}`}
                  className="text-muted border-0"
                  onClick={() => void cancel(d)}
                >
                  <X size={18} />
                </IconButton>
              )}
            </li>
          );
        })}
      </ul>
      <LoadMore query={q} skeleton={<SkeletonRows count={2} />} label="Older dates" />
    </section>
  );
}

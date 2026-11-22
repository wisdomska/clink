"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/components/ui/cn";
import { adminFetch } from "./fetch";

interface Funnel {
  days: number;
  steps: Array<{ key: string; count: number }>;
  waiting_on_partner: number;
  not_invited: number;
}

const LABEL: Record<string, string> = {
  signed_up: "Signed up",
  set_up: "Set up their profile",
  linked: "Linked with a partner",
  clinked: "Sent a clink",
  notify: "Turned on notifications",
};
const RANGES = [7, 30, 90] as const;

/**
 * From signing up to a first clink: how many new people reach each step, and
 * where the rest stopped. Counts only, admins left out.
 */
export function SignupFunnel() {
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const { data } = useQuery({
    queryKey: ["admin-funnel", days],
    queryFn: () => adminFetch<Funnel>(`/api/admin/funnel?days=${days}`),
    staleTime: 5 * 60_000,
  });
  const top = data?.steps[0]?.count ?? 0;
  return (
    <section aria-labelledby="funnel-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="funnel-title" className="m-0 text-lg font-bold">
          New people, step by step
        </h2>
        <div
          role="group"
          aria-label="Period"
          className="border-line flex rounded-full border p-0.5"
        >
          {RANGES.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={days === d}
              onClick={() => setDays(d)}
              className={cn(
                "press h-8 rounded-full px-3 text-xs font-semibold",
                days === d ? "bg-s3 text-text" : "text-muted hover:text-text",
              )}
            >
              {d} days
            </button>
          ))}
        </div>
      </div>
      {!data ? (
        <div className="an-skel rounded-card bg-s2 h-56" aria-hidden />
      ) : (
        <div className="rounded-card border-line bg-s1 flex flex-col gap-4 border p-4">
          {top === 0 ? (
            <p className="text-muted m-0 text-sm">No one new in the last {data.days} days.</p>
          ) : (
            <ol className="m-0 flex list-none flex-col gap-3 p-0" aria-label="Steps">
              {data.steps.map((s, i) => {
                const prev = i ? data.steps[i - 1]!.count : s.count;
                const lost = prev - s.count;
                const share = top ? s.count / top : 0;
                return (
                  <li key={s.key} className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span>{LABEL[s.key] ?? s.key}</span>
                      <span className="mono tabular-nums">
                        {s.count}
                        <span className="text-faint ml-2 text-xs">{Math.round(share * 100)}%</span>
                      </span>
                    </div>
                    <div className="bg-s3 h-2 overflow-hidden rounded-full">
                      <div
                        className="bg-accent h-full rounded-full"
                        style={{ width: `${Math.max(share * 100, s.count ? 2 : 0)}%` }}
                      />
                    </div>
                    {i > 0 && lost > 0 && (
                      <span className="text-faint text-xs">{lost} stopped before this step</span>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
          {(data.waiting_on_partner > 0 || data.not_invited > 0) && (
            <dl className="border-line m-0 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 border-t pt-3 text-sm">
              <dt className="text-muted">Invited a partner who hasn&apos;t joined yet</dt>
              <dd className="mono m-0 text-right">{data.waiting_on_partner}</dd>
              <dt className="text-muted">Set up but haven&apos;t invited anyone</dt>
              <dd className="mono m-0 text-right">{data.not_invited}</dd>
            </dl>
          )}
        </div>
      )}
    </section>
  );
}

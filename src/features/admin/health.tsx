"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { ArrowSquareOut, Bug, Gauge, PhoneCall } from "@phosphor-icons/react";
import Link from "@/components/ui/link";
import { adminFetch } from "./fetch";

interface Health {
  days: number;
  errors: {
    total: number;
    kinds: number;
    previous: number;
    top: Array<{ message: string; source: string; count: number; path: string | null }>;
  };
  calls: {
    total: number;
    connected: number;
    dropped: number;
    missed: number;
    minutes: number;
    previous_total: number;
    previous_dropped: number;
    reasons?: Record<string, number>;
  };
  pages: {
    views: number;
    avg_ms: number;
    slow_share: number;
    slowest: Array<{ path: string; views: number; avg_ms: number; slow: number }>;
  };
}

const REASON_LABEL: Record<string, string> = {
  "no-path": "Networks couldn't connect",
  lost: "Connection dropped",
  away: "Left Clink mid-call",
  offline: "Device offline",
  notified: "Notified, no answer",
  "no-answer": "Rang, no answer",
};

const secs = (ms: number) => `${(ms / 1000).toFixed(1)} s`;
const vs = (prev: number) => `${prev} the week before`;

/**
 * The week at a glance for the owner: errors, calls and page speed, with the
 * week before for comparison. Counts only, never content.
 */
export function WeeklyHealth() {
  const { data } = useQuery({
    queryKey: ["admin-health"],
    queryFn: () => adminFetch<Health>("/api/admin/health?days=7"),
    staleTime: 5 * 60_000,
  });
  if (!data) return <div className="an-skel rounded-card bg-s2 h-48" aria-hidden />;
  const { errors: e, calls: c, pages: p } = data;
  const dropRate = c.total ? Math.round((c.dropped / c.total) * 100) : 0;
  return (
    <section aria-labelledby="health-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="health-title" className="m-0 text-lg font-bold">
          This week&apos;s health
        </h2>
        <span className="text-faint text-xs">Last 7 days, compared with the 7 before</span>
      </div>
      <EmailSettings />
      <div className="rounded-card border-line bg-line grid gap-px overflow-hidden border lg:grid-cols-3">
        <article className="bg-s1 flex flex-col gap-2 p-4" aria-label="Errors">
          <div className="text-muted flex items-center gap-2 text-sm">
            <Bug size={18} aria-hidden /> Errors logged
          </div>
          <div className="mono text-[28px] leading-none tabular-nums">{e.total}</div>
          <div className="text-faint text-xs">
            {e.kinds} different, {vs(e.previous)}
          </div>
          {e.top.length > 0 && (
            <ol className="m-0 flex list-none flex-col gap-1 p-0 text-xs">
              {e.top.map((t, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mono text-muted w-7 flex-none text-right">{t.count}×</span>
                  <span className="min-w-0 truncate" title={t.message}>
                    {t.message}
                  </span>
                </li>
              ))}
            </ol>
          )}
          <Link href="/admin/errors" className="text-accent mt-auto text-sm font-semibold">
            Open the error log
          </Link>
        </article>
        <article className="bg-s1 flex flex-col gap-2 p-4" aria-label="Calls">
          <div className="text-muted flex items-center gap-2 text-sm">
            <PhoneCall size={18} aria-hidden /> Calls
          </div>
          <div className="mono text-[28px] leading-none tabular-nums">{c.connected}</div>
          <div className="text-faint text-xs">
            connected of {c.total} ({c.minutes} min talked), {vs(c.previous_total)}
          </div>
          <dl className="m-0 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <dt className="text-muted">Dropped</dt>
            <dd className="mono m-0 text-right">
              {c.dropped} ({dropRate}%)
            </dd>
            <dt className="text-muted">Missed or declined</dt>
            <dd className="mono m-0 text-right">{c.missed}</dd>
            <dt className="text-muted">Dropped the week before</dt>
            <dd className="mono m-0 text-right">{c.previous_dropped}</dd>
          </dl>
          {Object.keys(c.reasons ?? {}).length > 0 && (
            <dl
              className="border-line m-0 grid grid-cols-2 gap-x-3 gap-y-1 border-t pt-2 text-xs"
              aria-label="Why calls didn't go through"
            >
              {Object.entries(c.reasons!)
                .sort((x, y) => y[1] - x[1])
                .map(([k, n]) => (
                  <div key={k} className="contents">
                    <dt className="text-muted">{REASON_LABEL[k] ?? k}</dt>
                    <dd className="mono m-0 text-right">{n}</dd>
                  </div>
                ))}
            </dl>
          )}
        </article>
        <article className="bg-s1 flex flex-col gap-2 p-4" aria-label="Page speed">
          <div className="text-muted flex items-center gap-2 text-sm">
            <Gauge size={18} aria-hidden /> Page speed
          </div>
          <div className="mono text-[28px] leading-none tabular-nums">
            {p.views ? secs(p.avg_ms) : "No data yet"}
          </div>
          <div className="text-faint text-xs">
            {p.views
              ? `average first load over ${p.views} visits, ${Math.round(p.slow_share * 100)}% slower than 2.5 s`
              : "Fills in as people use Clink."}
          </div>
          {p.slowest.length > 0 && (
            <ol
              className="m-0 flex list-none flex-col gap-1 p-0 text-xs"
              aria-label="Slowest screens"
            >
              {p.slowest.map((s) => (
                <li key={s.path} className="flex gap-2">
                  <span className="mono min-w-0 flex-1 truncate">{s.path}</span>
                  <span className="mono text-muted flex-none">{secs(s.avg_ms)}</span>
                </li>
              ))}
            </ol>
          )}
          <a
            href="https://vercel.com/dashboard/usage"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent mt-auto inline-flex items-center gap-1 text-sm font-semibold"
          >
            Vercel usage <ArrowSquareOut size={14} aria-hidden />
          </a>
        </article>
      </div>
    </section>
  );
}

/** The same summary by email every Monday, per admin. */
function EmailSettings() {
  const qc = useQueryClient();
  const [sending, setSending] = useState(false);
  const { data } = useQuery({
    queryKey: ["admin-health-email"],
    queryFn: () => adminFetch<{ weekly: boolean; email: string | null }>("/api/admin/health/email"),
  });
  if (!data) return null;
  return (
    <div className="rounded-card border-line bg-s1 flex flex-wrap items-center gap-3 border px-4 py-3">
      <div className="min-w-0 flex-1">
        <Toggle
          label="Email me this every Monday"
          sub={data.email ? `To ${data.email}` : undefined}
          last
          checked={data.weekly}
          onChange={async (on: boolean) => {
            qc.setQueryData(["admin-health-email"], { ...data, weekly: on });
            await adminFetch("/api/admin/health/email", { method: "PATCH", body: { weekly: on } });
          }}
        />
      </div>
      <Button
        size="sm"
        variant="secondary"
        loading={sending}
        onClick={async () => {
          setSending(true);
          try {
            await adminFetch("/api/admin/health/email", { method: "POST" });
            toast.ok("Sent. Check your inbox.");
          } catch (e) {
            toast.err(e instanceof Error ? e.message : "That didn't send.");
          } finally {
            setSending(false);
          }
        }}
      >
        Send one now
      </Button>
    </div>
  );
}

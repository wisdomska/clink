"use client";
import { useQuery } from "@tanstack/react-query";
import { Warning } from "@phosphor-icons/react";
import { Display } from "@/components/ui/heading";
import { adminFetch, fmtBytes } from "./fetch";

type Metrics = Record<string, number> & { activity_mix: Record<string, number>; dare_outcomes: Record<string, number> };
interface Data {
  metrics: Metrics;
  usage: Record<string, { used: number; limit: number; note?: string; driver?: string }>;
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-card border border-line bg-s1 p-4">
      <div className="text-sm text-muted">{label}</div>
      <div className="mono text-[32px] leading-none">{value}</div>
      {sub && <div className="text-xs text-faint">{sub}</div>}
    </div>
  );
}

function Usage({ label, used, limit, bytes, note }: { label: string; used: number; limit: number; bytes?: boolean; note?: string }) {
  const pct = limit ? used / limit : 0;
  const color = pct >= 0.9 ? "var(--danger)" : pct >= 0.7 ? "var(--warning)" : "var(--accent)";
  return (
    <div className="flex flex-col gap-2 rounded-card border border-line bg-s1 p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="mono text-muted">
          {bytes ? fmtBytes(used) : used} / {bytes ? fmtBytes(limit) : limit}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-s3" role="meter" aria-valuenow={Math.round(pct * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`${label} ${Math.round(pct * 100)}%`}>
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct * 100)}%`, background: color }} />
      </div>
      {pct >= 0.7 && (
        <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color }}>
          <Warning size={14} aria-hidden />
          {pct >= 0.9 ? "Over 90%. Upgrade or clean up now." : "Over 70%. Plan the next step."}
        </div>
      )}
      {note && <div className="text-xs text-faint">{note}</div>}
    </div>
  );
}

/** Aggregate metrics only (spec 16 dashboards). No content anywhere. */
export function AdminDashboard() {
  const { data } = useQuery({ queryKey: ["admin-metrics"], queryFn: () => adminFetch<Data>("/api/admin/metrics"), refetchInterval: 60_000 });
  const m = data?.metrics;
  const pct = (a?: number, b?: number) => (a !== undefined && b ? `${Math.round((a / b) * 100)}%` : "0%");
  const passRate = m ? pct(m.dare_outcomes?.passed ?? 0, Object.values(m.dare_outcomes ?? {}).reduce((x, y) => x + y, 0)) : "0%";
  return (
    <div className="an-screen flex flex-col gap-6">
      <Display size={36}>Dashboard</Display>
      {!m ? (
        <div className="an-skel h-40 rounded-card bg-s2" />
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6" aria-label="Growth">
            <Stat label="Accounts" value={m.users ?? 0} sub={`${m.signups_7d} this week`} />
            <Stat label="Linked couples" value={m.couples_active ?? 0} sub={`${m.couples_linked_7d} this week`} />
            <Stat label="Activation" value={pct(m.activated, m.couples_active)} sub="Shared activity within 24 h" />
            <Stat label="Weekly retention" value={pct(m.weekly_retained, m.couples_active)} sub="Both active this week" />
            <Stat label="After Dark, Steamy+" value={pct(m.dark_couples_steamy, m.couples_active)} sub={`${m.dark_opted_in_users} people opted in`} />
            <Stat label="Reports per 1,000" value={m.couples_active ? (((m.reports_total ?? 0) / m.couples_active) * 1000).toFixed(1) : "0"} sub={`${m.reports_open} open`} />
          </section>
          <section aria-label="Activity mix" className="flex flex-col gap-3">
            <h2 className="m-0 text-lg font-bold">Activity mix, last 7 days</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
              {Object.entries(m.activity_mix ?? {}).map(([k, v]) => (
                <div key={k} className="rounded-input border border-line bg-s1 p-3">
                  <div className="mono text-xl">{v}</div>
                  <div className="text-xs text-muted capitalize">{k.replace("_", " ")}</div>
                </div>
              ))}
            </div>
            <div className="text-sm text-muted">Dare pass rate: {passRate}. Shared activity ratio: {m.activity_mix?.messages ? `1 : ${Math.round(m.activity_mix.messages / Math.max(1, (m.activity_mix.games ?? 0) + (m.activity_mix.dates ?? 0) + (m.activity_mix.watch ?? 0) + (m.activity_mix.letters ?? 0) + (m.activity_mix.capsules ?? 0) + (m.activity_mix.challenge_days ?? 0)))}` : "n/a"}</div>
          </section>
          <section aria-label="Free tier usage" className="flex flex-col gap-3">
            <h2 className="m-0 text-lg font-bold">Free-tier usage</h2>
            <div className="grid gap-3 md:grid-cols-3">
              <Usage label="Database" used={data!.usage.db!.used} limit={data!.usage.db!.limit} bytes />
              <Usage label={`Media storage (${data!.usage.storage!.driver === "r2" ? "Cloudflare R2" : "Supabase"})`} used={data!.usage.storage!.used} limit={data!.usage.storage!.limit} bytes />
              <Usage label="Realtime connections" used={data!.usage.realtime!.used} limit={data!.usage.realtime!.limit} note={data!.usage.realtime!.note} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

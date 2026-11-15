"use client";
import { useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { DownloadSimple, Megaphone, ToggleRight, Warning } from "@phosphor-icons/react";
import { Display } from "@/components/ui/heading";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { adminFetch, fmtBytes } from "./fetch";
import { TrendCard, downloadCsv } from "./ui";

type TrendKey = "signups" | "links" | "active_couples" | "clinks" | "messages" | "games";
interface Trends {
  days: number;
  series: Array<Record<TrendKey, number> & { day: string }>;
  totals: Record<TrendKey, { current: number; previous: number }>;
}
const TREND_LABELS: Record<TrendKey, string> = {
  signups: "Sign-ups",
  links: "Couples linked",
  active_couples: "Active couples (peak day)",
  clinks: "Clinks sent",
  messages: "Messages",
  games: "Games started",
};

/** Daily trends with change vs the previous period. Counts only. */
function TrendsSection() {
  const [days, setDays] = useState<"7" | "30">("7");
  const { data, isFetching } = useQuery({
    queryKey: ["admin-trends", days],
    queryFn: () => adminFetch<Trends>(`/api/admin/trends?days=${days}`),
    placeholderData: keepPreviousData,
    refetchInterval: 5 * 60_000,
  });
  return (
    <section aria-label="Trends" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 text-lg font-bold">Trends</h2>
        <div className="flex items-center gap-2">
          <div className="w-[180px]">
            <Segmented
              label="Range"
              value={days}
              onChange={setDays}
              options={[
                { value: "7", label: "7 days" },
                { value: "30", label: "30 days" },
              ]}
            />
          </div>
          <Button
            size="xs"
            variant="ghost"
            softDisabled={!data}
            onClick={() =>
              data &&
              downloadCsv(
                `clink-trends-${data.days}d-${new Date().toISOString().slice(0, 10)}.csv`,
                data.series,
              )
            }
          >
            <DownloadSimple size={16} aria-hidden /> Export CSV
          </Button>
        </div>
      </div>
      {!data ? (
        <div className="an-skel rounded-card bg-s2 h-40" />
      ) : (
        <div
          className="grid grid-cols-2 gap-3 transition-opacity duration-200 md:grid-cols-3"
          style={{ opacity: isFetching ? 0.6 : 1 }}
        >
          {(Object.keys(TREND_LABELS) as TrendKey[]).map((k) => (
            <TrendCard
              key={k}
              label={TREND_LABELS[k]}
              current={data.totals[k].current}
              previous={data.totals[k].previous}
              days={data.days}
              series={data.series.map((r) => ({ day: r.day, value: r[k] }))}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/** Anything currently changing what couples see, so nothing stays on by accident. */
function LiveSwitches() {
  const { data } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () =>
      adminFetch<{
        flags: Array<{ key: string; enabled: boolean; description: string | null }>;
        announcements: Array<{ id: string; kind: string; body: string; active: boolean }>;
      }>("/api/admin/settings"),
  });
  if (!data) return null;
  const live = [
    ...data.announcements
      .filter((a) => a.active)
      .map((a) => ({
        id: a.id,
        icon: a.kind === "maintenance" ? Warning : Megaphone,
        text: `${a.kind === "maintenance" ? "Maintenance banner" : "Announcement"}: ${a.body}`,
        tone: a.kind === "maintenance" ? "var(--warning)" : "var(--accent)",
      })),
    ...data.flags
      .filter((f) => f.enabled)
      .map((f) => ({
        id: f.key,
        icon: ToggleRight,
        text: `Feature flag on: ${f.description || f.key}`,
        tone: "var(--partner-b)",
      })),
  ];
  return (
    <section aria-label="Live switches" className="rounded-card border-line bg-s1 border p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="m-0 text-base font-bold">Live switches</h2>
        <Link href="/admin/settings" className="text-accent text-sm font-medium">
          Settings
        </Link>
      </div>
      {live.length ? (
        <ul className="m-0 mt-2 flex list-none flex-col gap-1.5 p-0">
          {live.map(({ id, icon: Icon, text, tone }) => (
            <li key={id} className="flex items-start gap-2 text-sm">
              <Icon size={16} className="mt-0.5 flex-none" style={{ color: tone }} aria-hidden />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted m-0 mt-1 text-sm">
          Nothing is switched on, so couples see the default app. Banners and flags you turn on in
          Settings show here.
        </p>
      )}
    </section>
  );
}

type Metrics = Record<string, number> & {
  activity_mix: Record<string, number>;
  dare_outcomes: Record<string, number>;
};
interface Data {
  metrics: Metrics;
  usage: Record<string, { used: number; limit: number; note?: string; driver?: string }>;
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-card border-line bg-s1 flex flex-col gap-1 border p-4">
      <div className="text-muted text-sm">{label}</div>
      <div className="mono text-[32px] leading-none">{value}</div>
      {sub && <div className="text-faint text-xs">{sub}</div>}
    </div>
  );
}

function Usage({
  label,
  used,
  limit,
  bytes,
  note,
}: {
  label: string;
  used: number;
  limit: number;
  bytes?: boolean;
  note?: string;
}) {
  const pct = limit ? used / limit : 0;
  const color = pct >= 0.9 ? "var(--danger)" : pct >= 0.7 ? "var(--warning)" : "var(--accent)";
  return (
    <div className="rounded-card border-line bg-s1 flex flex-col gap-2 border p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="mono text-muted">
          {bytes ? fmtBytes(used) : used} / {bytes ? fmtBytes(limit) : limit}
        </span>
      </div>
      <div
        className="bg-s3 h-2 overflow-hidden rounded-full"
        role="meter"
        aria-valuenow={Math.round(pct * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} ${Math.round(pct * 100)}%`}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(100, pct * 100)}%`, background: color }}
        />
      </div>
      {pct >= 0.7 && (
        <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color }}>
          <Warning size={14} aria-hidden />
          {pct >= 0.9
            ? "Over 90% used. Upgrade the plan or free up space now."
            : "Over 70% used. Plan an upgrade or a cleanup soon."}
        </div>
      )}
      {note && <div className="text-faint text-xs">{note}</div>}
    </div>
  );
}

/** Aggregate metrics only (spec 16 dashboards). No content anywhere. */
export function AdminDashboard() {
  const { data } = useQuery({
    queryKey: ["admin-metrics"],
    queryFn: () => adminFetch<Data>("/api/admin/metrics"),
    refetchInterval: 60_000,
  });
  const m = data?.metrics;
  const pct = (a?: number, b?: number) =>
    a !== undefined && b ? `${Math.round((a / b) * 100)}%` : "0%";
  const passRate = m
    ? pct(
        m.dare_outcomes?.passed ?? 0,
        Object.values(m.dare_outcomes ?? {}).reduce((x, y) => x + y, 0),
      )
    : "0%";
  return (
    <div className="an-screen flex flex-col gap-6">
      <Display size={36}>Dashboard</Display>
      {!m ? (
        <div className="an-skel rounded-card bg-s2 h-40" />
      ) : (
        <>
          <section
            className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6"
            aria-label="Growth"
          >
            <Stat label="Accounts" value={m.users ?? 0} sub={`${m.signups_7d} this week`} />
            <Stat
              label="Linked couples"
              value={m.couples_active ?? 0}
              sub={`${m.couples_linked_7d} this week`}
            />
            <Stat
              label="Activation"
              value={pct(m.activated, m.couples_active)}
              sub="Did something together within 24 h"
            />
            <Stat
              label="Weekly retention"
              value={pct(m.weekly_retained, m.couples_active)}
              sub="Both active this week"
            />
            <Stat
              label="After Dark, Steamy+"
              value={pct(m.dark_couples_steamy, m.couples_active)}
              sub={`${m.dark_opted_in_users} people opted in`}
            />
            <Stat
              label="Reports per 1,000"
              value={
                m.couples_active
                  ? (((m.reports_total ?? 0) / m.couples_active) * 1000).toFixed(1)
                  : "0"
              }
              sub={`${m.reports_open} open`}
            />
          </section>
          <LiveSwitches />
          <TrendsSection />
          <section aria-label="Activity mix" className="flex flex-col gap-3">
            <h2 className="m-0 text-lg font-bold">Activity mix, last 7 days</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
              {Object.entries(m.activity_mix ?? {}).map(([k, v]) => (
                <div key={k} className="rounded-input border-line bg-s1 border p-3">
                  <div className="mono text-xl">{v}</div>
                  <div className="text-muted text-xs capitalize">{k.replace("_", " ")}</div>
                </div>
              ))}
            </div>
            <div className="text-muted text-sm">
              Dare pass rate: {passRate}. Shared activities to messages:{" "}
              {m.activity_mix?.messages
                ? `1 : ${Math.round(m.activity_mix.messages / Math.max(1, (m.activity_mix.games ?? 0) + (m.activity_mix.dates ?? 0) + (m.activity_mix.watch ?? 0) + (m.activity_mix.letters ?? 0) + (m.activity_mix.capsules ?? 0) + (m.activity_mix.challenge_days ?? 0)))}`
                : "no messages yet"}
            </div>
          </section>
          <section aria-label="Free tier usage" className="flex flex-col gap-3">
            <h2 className="m-0 text-lg font-bold">Free-tier usage</h2>
            <div className="grid gap-3 md:grid-cols-3">
              <Usage
                label="Database"
                used={data!.usage.db!.used}
                limit={data!.usage.db!.limit}
                bytes
              />
              <Usage
                label={`Media storage (${data!.usage.storage!.driver === "r2" ? "Cloudflare R2" : "Supabase"})`}
                used={data!.usage.storage!.used}
                limit={data!.usage.storage!.limit}
                bytes
              />
              <Usage
                label="Realtime connections"
                used={data!.usage.realtime!.used}
                limit={data!.usage.realtime!.limit}
                note={data!.usage.realtime!.note}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

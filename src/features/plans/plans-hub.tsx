"use client";
import { haptic } from "@/lib/feedback";
import { useState } from "react";
import Link from "@/components/ui/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Shuffle,
  TelevisionSimple,
  Scissors,
  MusicNotes,
  ListChecks,
  Ticket as TicketIcon,
} from "@phosphor-icons/react";
import { useCouple } from "@/features/couple/context";
import { Lead } from "@/components/ui/heading";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { wallTime, localParts } from "@/lib/time";
import { dayNumber, streak } from "@/lib/challenges";
import { TicketStub, KitStub } from "./tickets";
import { useKits, useUpcomingDates, useChallenge, dateListKey, type DateRow } from "./data";
import { DateList } from "./date-list";
import { editList, rollback } from "./infinite";
import { FindLinks } from "@/features/search/search-shortcut";
import { PageBar } from "@/components/clink/page-bar";

export function PlansHub() {
  const { me, partner, coupleId } = useCouple();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: kits = [] } = useKits();
  const { data: dates = [] } = useUpcomingDates();
  const { data: ch } = useChallenge();
  const [torn, setTorn] = useState(false);

  const next =
    dates.find((d) => d.status !== "completed") ?? (torn ? dates[dates.length - 1] : undefined);
  const nextKit = next?.date_kits as unknown as { title: string } | undefined;

  async function tear() {
    // A just-booked date is still being saved; nothing to tear yet.
    if (!next || next.id.startsWith("temp-")) return;
    setTorn(true);
    haptic("heavy");
    const id = next.id;
    const snap = await editList<DateRow>(qc, dateListKey(coupleId), (items) =>
      items.map((d) => (d.id === id ? { ...d, status: "completed" } : d)),
    );
    const r = await fetch(`/api/dates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    }).catch(() => null);
    if (!r?.ok) {
      setTorn(false);
      rollback(qc, dateListKey(coupleId), snap);
      return toast.err("Couldn't tear it. Try again.");
    }
    toast("Torn off. Added to your timeline.");
    setTimeout(() => {
      setTorn(false);
      void qc.invalidateQueries({ queryKey: ["dates", coupleId] });
    }, 1600);
  }

  const c = ch?.challenge;
  const tpl = c?.challenge_templates as unknown as { title: string; days: number } | undefined;
  const today = c ? dayNumber(c.start_on, localParts(new Date(), me.timezone).dateKey) : 0;
  const weekStart = Math.max(1, Math.floor((today - 1) / 7) * 7 + 1);
  const week = Array.from({ length: 7 }, (_, i) => weekStart + i);
  const byDay = new Map((ch?.days ?? []).map((d) => [d.day, d]));
  const meA = me.role === "a";
  const s = c ? streak(ch!.days, today) : 0;

  return (
    <div className="screen an-screen flex flex-col gap-5">
      <PageBar title="Plans" actions={<FindLinks />} />
      <Lead className="-mt-2">Date nights, planned together.</Lead>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-10 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          {next && nextKit ? (
            <>
              <TicketStub
                label={`${new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: me.timezone }).format(new Date(next.start_at)).replace(",", "")} · Next date`}
                title={nextKit.title}
                times={
                  <>
                    <span>
                      {wallTime(new Date(next.start_at), me.timezone)} {me.city}
                    </span>
                    <span className="text-faint">/</span>
                    <span>
                      {wallTime(
                        new Date(next.start_at),
                        partner.timezone,
                        localParts(new Date(next.start_at), partner.timezone).dateKey !==
                          localParts(new Date(next.start_at), me.timezone).dateKey,
                      )}{" "}
                      {partner.city}
                    </span>
                  </>
                }
                ticketNo={String(next.ticket_no).padStart(4, "0")}
                torn={torn}
              />
              {!torn && (
                <div className="-mt-2 flex flex-wrap gap-2">
                  <Link
                    href={`/plans/kits/${next.kit_id}`}
                    className="press border-line bg-s2 text-text hover:text-text flex h-11 items-center rounded-full border px-4 text-sm font-medium"
                  >
                    Open the kit
                  </Link>
                  <Button variant="accent-text" size="sm" onClick={tear}>
                    <Scissors size={18} aria-hidden />
                    We did it. Tear the stub
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-card border-line flex flex-col items-start gap-3 border border-dashed p-5">
              <TicketIcon size={36} className="text-faint" aria-hidden />
              <div className="display text-[28px] leading-[1.05]">The booth is empty.</div>
              <p className="text-muted m-0 text-base">
                No date on the books. Pick a kit below, or spin for one.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 items-stretch gap-2.5">
            {[
              { href: "/plans/roulette", Icon: Shuffle, title: "Can't pick? Spin for a date." },
              { href: "/plans/watch", Icon: TelevisionSimple, title: "Watch party" },
            ].map(({ href, Icon, title }) => (
              <button
                key={href}
                type="button"
                onClick={() => router.push(href)}
                className="press rounded-card border-line bg-s1 text-text flex h-full min-h-[140px] w-full cursor-pointer flex-col justify-between gap-4 border p-4 text-left"
              >
                <Icon size={26} className="text-accent" aria-hidden />
                <span className="display text-[22px] leading-[1.1] tracking-normal not-italic">
                  {title}
                </span>
              </button>
            ))}
          </div>
          <div className="rounded-card border-line bg-s1 divide-line flex flex-col divide-y overflow-hidden border">
            {[
              {
                href: "/plans/list",
                Icon: ListChecks,
                title: "Our list",
                sub: "Things to do together",
              },
              {
                href: "/plans/listen",
                Icon: MusicNotes,
                title: "Listen together",
                sub: "Shared queue",
              },
            ].map(({ href, Icon, title, sub }) => (
              <Link
                key={href}
                href={href}
                className="press text-text hover:text-text hover:bg-s2 flex min-h-14 items-center gap-3 px-4 py-3.5"
              >
                <Icon size={24} className="text-accent flex-none" aria-hidden />
                <span className="min-w-0 flex-1 text-base font-bold">{title}</span>
                <span className="text-muted truncate text-sm">{sub}</span>
              </Link>
            ))}
          </div>
          <DateList />
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <h2 className="m-0 text-lg font-bold">Date night kits</h2>
          <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:grid-cols-2 lg:overflow-visible lg:px-0 2xl:grid-cols-3">
            {kits.map((k, i) => (
              <Link
                key={k.id}
                href={`/plans/kits/${k.id}`}
                className="text-text hover:text-text flex-none"
              >
                <KitStub title={k.title} minutes={k.minutes} i={i} />
              </Link>
            ))}
          </div>

          {c && tpl ? (
            <Link
              href={`/plans/challenges/${c.id}`}
              className="rounded-card border-line bg-s1 text-text hover:text-text flex flex-none flex-col gap-3.5 border p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-muted text-xs">
                    Challenge ·{" "}
                    {c.status === "completed"
                      ? "Complete"
                      : `Day ${Math.min(today, tpl.days)} of ${tpl.days}`}
                  </div>
                  <div className="display mt-1 text-[22px] tracking-normal">{tpl.title}</div>
                </div>
                <div className="text-right">
                  <div className="mono text-accent text-[36px] leading-none">{s}</div>
                  <div className="text-faint text-xs">Streak</div>
                </div>
              </div>
              <div role="group" className="grid grid-cols-7 gap-1" aria-label="This week">
                {week.map((d, i) => {
                  const row = byDay.get(d);
                  const a = meA ? row?.done_by_a : row?.done_by_b;
                  const b = meA ? row?.done_by_b : row?.done_by_a;
                  return (
                    <div
                      role="group"
                      key={d}
                      className="flex flex-col items-center gap-1.5"
                      aria-label={`Day ${d}: ${a ? "you done" : "you not yet"}, ${b ? `${partner.name} done` : `${partner.name} not yet`}`}
                    >
                      <span
                        className="mono text-xs"
                        style={{ color: d === today ? "var(--text)" : "var(--text-faint)" }}
                      >
                        {
                          ["M", "T", "W", "T", "F", "S", "S"][
                            (i + new Date(`${c.start_on}T00:00:00Z`).getUTCDay() + 6) % 7
                          ]
                        }
                      </span>
                      <span
                        className="h-4 w-4 rounded-full"
                        style={{
                          background: a ? "var(--partner-a)" : "transparent",
                          border: `1.5px solid ${a ? "var(--partner-a)" : "var(--text-faint)"}`,
                        }}
                      />
                      <span
                        className="h-4 w-4"
                        style={{
                          background: b ? "var(--partner-b)" : "transparent",
                          border: `1.5px solid ${b ? "var(--partner-b)" : "var(--text-faint)"}`,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="text-muted flex flex-wrap items-center gap-2 text-sm">
                Badges
                {["First week", "No misses", tpl.days === 30 ? "30 for 30" : "7 for 7"].map((b) => (
                  <span
                    key={b}
                    className="rounded-full px-2.5 py-1 text-[13px]"
                    style={{
                      border: ch!.badges.includes(b)
                        ? "1px solid var(--accent)"
                        : "1px dashed var(--text-faint)",
                      color: ch!.badges.includes(b) ? "var(--text)" : "var(--text-muted)",
                    }}
                  >
                    {b}
                  </span>
                ))}
              </div>
            </Link>
          ) : (
            <Link
              href="/plans/challenges/new"
              className="rounded-card border-line text-text hover:text-text flex flex-col gap-2 border border-dashed p-4"
            >
              <div className="display text-[22px] tracking-normal">
                Start a 7- or 30-day challenge
              </div>
              <div className="text-muted text-sm">
                Tick it off daily, both of you. Streaks and badges included.
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

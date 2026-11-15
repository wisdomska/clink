"use client";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChatCircle,
  Clock,
  Copy,
  DeviceMobile,
  Envelope,
  Fingerprint,
  GameController,
  HardDrives,
  Heart,
  MapPin,
  Moon,
  ShieldWarning,
  Smiley,
  Wine,
} from "@phosphor-icons/react";
import { Display } from "@/components/ui/heading";
import { Button } from "@/components/ui/button";
import { Avatar, type AvatarIcon } from "@/components/ui/avatar";
import { toast } from "@/components/ui/toast";
import { cn } from "@/components/ui/cn";
import { GAME_META } from "@/features/play/meta";
import type { GameType } from "@/features/play/engines/types";
import { adminFetch } from "./fetch";
import { useConfirm } from "./ui";
import { NavTabs, TabPanel, useTab } from "@/components/ui/nav-tabs";
import { AdminConversation } from "./conversation";

interface Detail {
  account: {
    id: string;
    email: string;
    createdAt: string;
    lastSignInAt: string | null;
    confirmedAt: string | null;
    providers: string[];
    passkeys: number;
    mustChangePassword: boolean;
  };
  profile: {
    display_name: string | null;
    avatar_icon: string | null;
    home_city: string | null;
    country: string | null;
    timezone: string | null;
    onboarded_at: string | null;
    suspended_at: string | null;
    is_admin: boolean;
    discreet_mode: boolean;
    quiet_start: string | null;
    quiet_end: string | null;
    age: number | null;
  } | null;
  presence: { status: string; last_seen_at: string | null } | null;
  couple: {
    role: string;
    linkedAt: string | null;
    startedOn: string | null;
    chatTheme: string | null;
    partner: { id: string; name: string; email: string } | null;
    games: {
      total: number;
      finished: number;
      won: number;
      byType: Record<string, number>;
      last: string | null;
    };
  } | null;
  pastCouples: number;
  afterDark: { optedIn: boolean; since: string | null };
  pushDevices: number;
  counts: {
    messagesTotal: number;
    messages7: number;
    messages30: number;
    clinksTotal: number;
    clinks30: number;
    moodsTotal: number;
    letters: number;
    capsules: number;
    countdowns: number;
    msgTypes: Record<string, number>;
  };
  storage: {
    files: number;
    bytes: number;
    images: number;
    videos: number;
    audio: number;
    private: number;
  };
  chart: Array<{ day: string; n: number }>;
  timeline: Array<{ event: string; at: string; byAdmin: boolean; meta: Record<string, unknown> }>;
  reports: {
    about: Array<{ id: string; category: string; status: string; created_at: string }>;
    by: Array<{ id: string; category: string; status: string; created_at: string }>;
  };
}

const when = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Never";
const ago = (iso: string | null | undefined) => {
  if (!iso) return "never";
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 2) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
};
const bytes = (n: number) =>
  n > 1e9
    ? `${(n / 1e9).toFixed(1)} GB`
    : n > 1e6
      ? `${(n / 1e6).toFixed(1)} MB`
      : `${Math.round(n / 1e3)} KB`;

const EVENT_COPY: Record<string, string> = {
  login: "Signed in",
  signout: "Signed out",
  signout_all: "Signed out of all devices",
  password_changed: "Changed password",
  "admin.suspend": "Suspended by an admin",
  "admin.unsuspend": "Suspension lifted by an admin",
  "admin.force_unlink": "Couple force-unlinked by an admin",
  "admin.delete": "Deleted by an admin",
};
const eventLabel = (e: string) =>
  EVENT_COPY[e] ??
  e
    .replace(/^admin\./, "Admin: ")
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());

function Stat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="bg-s1 flex flex-col gap-1 p-4">
      <span className="text-muted flex items-center gap-1.5 text-xs font-medium">
        {icon}
        {label}
      </span>
      <span className="mono text-[26px] leading-none tabular-nums">{value}</span>
      {sub && <span className="text-faint text-xs">{sub}</span>}
    </div>
  );
}

function Row({ k, v }: { k: React.ReactNode; v: React.ReactNode }) {
  return (
    <div className="border-line flex items-start justify-between gap-4 border-b py-2.5 text-sm last:border-0">
      <span className="text-muted flex-none">{k}</span>
      <span className="min-w-0 text-right break-words">{v}</span>
    </div>
  );
}

function Card({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("rounded-card border-line bg-s1 border p-5", className)}
      aria-label={title}
    >
      <h2 className="m-0 mb-3 text-base font-bold">{title}</h2>
      {children}
    </section>
  );
}

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "profile", label: "Profile" },
  { value: "conversation", label: "Conversation" },
  { value: "history", label: "History" },
] as const;

/** One user, in detail: account, activity and (behind a logged reason) their chat. */
export function UserDetail({ id }: { id: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { ask, dialog } = useConfirm();
  const tab = useTab(TABS);
  const {
    data: d,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin-user", id],
    queryFn: () => adminFetch<Detail>(`/api/admin/users/${id}/detail`),
  });

  async function act(action: "suspend" | "unsuspend" | "force_unlink" | "delete") {
    const copy = {
      suspend: {
        title: "Suspend this account?",
        body: "They're signed out everywhere and can't sign back in until you lift it.",
        confirm: "Suspend",
        danger: true,
        reason: "required" as const,
      },
      unsuspend: {
        title: "Lift this suspension?",
        body: "They can sign in again straight away.",
        confirm: "Lift suspension",
      },
      force_unlink: {
        title: "Force unlink this couple?",
        body: "Both people are unlinked and go back to the linking screen. Private media is wiped for both within an hour.",
        confirm: "Force unlink",
        danger: true,
        reason: "required" as const,
      },
      delete: {
        title: "Delete this account?",
        body: "Their account and everything they made are removed. This can't be undone.",
        confirm: "Delete for good",
        danger: true,
        reason: "required" as const,
        typed: "DELETE",
      },
    }[action];
    const answer = await ask(copy);
    if (!answer) return;
    try {
      await adminFetch(`/api/admin/users/${id}`, { body: { action, reason: answer.reason } });
      toast.ok("Saved. Added to the audit log.");
      if (action === "delete") return router.push("/admin/users");
      void qc.invalidateQueries({ queryKey: ["admin-user", id] });
    } catch (e) {
      toast.err(e instanceof Error ? e.message : "Couldn't do that. Try again.");
    }
  }

  if (isLoading)
    return (
      <div className="flex flex-col gap-4">
        <div className="an-skel rounded-card bg-s2 h-28" />
        <div className="an-skel rounded-card bg-s2 h-24" />
      </div>
    );
  if (error || !d)
    return (
      <p className="text-muted">
        Couldn&apos;t load this user. They may have been deleted. Go back to All users and search
        again.
      </p>
    );

  const p = d.profile;
  const name = p?.display_name || "No name yet";
  const max = Math.max(1, ...d.chart.map((c) => c.n));
  const active = d.chart.filter((c) => c.n > 0).length;
  const tabs = TABS.map((t) =>
    t.value === "history" ? { ...t, count: d.reports.about.length + d.reports.by.length } : t,
  );
  const status = p?.suspended_at ? "Suspended" : !d.account.confirmedAt ? "Unconfirmed" : "Active";

  return (
    <div className="an-screen flex flex-col gap-5">
      {dialog}
      <Link
        href="/admin/users"
        className="text-muted hover:text-text flex items-center gap-1.5 self-start text-sm"
      >
        <ArrowLeft size={16} aria-hidden /> All users
      </Link>

      <header className="rounded-card border-line bg-s1 flex flex-wrap items-center gap-4 border p-5">
        <Avatar
          name={name}
          side="me"
          size={72}
          icon={(p?.avatar_icon ?? null) as AvatarIcon | null}
        />
        <div className="min-w-0 flex-1">
          <Display size={28}>{name}</Display>
          <div className="text-muted flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="flex items-center gap-1">
              <Envelope size={14} aria-hidden /> {d.account.email}
            </span>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(d.account.id);
                toast("User ID copied.");
              }}
              className="mono text-faint hover:text-text flex cursor-pointer items-center gap-1 border-0 bg-transparent text-xs"
            >
              <Copy size={12} aria-hidden /> {d.account.id.slice(0, 8)}
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-semibold",
                status === "Active" ? "bg-[#34C759]/15 text-[#34C759]" : "bg-danger/15 text-danger",
              )}
            >
              {status}
            </span>
            {p?.is_admin && (
              <span className="border-line-strong rounded-full border px-2.5 py-1 text-xs font-medium">
                Admin
              </span>
            )}
            {d.couple && (
              <span className="bg-s2 rounded-full px-2.5 py-1 text-xs font-medium">Linked</span>
            )}
            {d.afterDark.optedIn && (
              <span className="bg-s2 rounded-full px-2.5 py-1 text-xs font-medium">
                After Dark on
              </span>
            )}
            <span className="bg-s2 text-muted rounded-full px-2.5 py-1 text-xs font-medium">
              Last seen {ago(d.presence?.last_seen_at ?? d.account.lastSignInAt)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {p?.suspended_at ? (
            <Button size="xs" variant="ghost" onClick={() => act("unsuspend")}>
              Lift suspension
            </Button>
          ) : (
            <Button size="xs" variant="ghost" onClick={() => act("suspend")}>
              Suspend
            </Button>
          )}
          {d.couple && (
            <Button size="xs" variant="ghost" onClick={() => act("force_unlink")}>
              Force unlink
            </Button>
          )}
          <Button size="xs" variant="danger-outline" onClick={() => act("delete")}>
            Delete
          </Button>
        </div>
      </header>

      <NavTabs label="User sections" tabs={tabs} className="self-start" />

      {tab === "overview" && (
        <TabPanel key="overview" className="flex flex-col gap-5">
          <div className="rounded-card border-line bg-line grid grid-cols-2 gap-px overflow-hidden border md:grid-cols-4">
            <Stat
              icon={<ChatCircle size={14} />}
              label="Messages"
              value={d.counts.messagesTotal}
              sub={`${d.counts.messages7} this week · ${d.counts.messages30} in 30 days`}
            />
            <Stat
              icon={<Wine size={14} />}
              label="Clinks sent"
              value={d.counts.clinksTotal}
              sub={`${d.counts.clinks30} in 30 days`}
            />
            <Stat
              icon={<GameController size={14} />}
              label="Games finished"
              value={d.couple?.games.finished ?? 0}
              sub={d.couple ? `${d.couple.games.won} won` : "Not linked"}
            />
            <Stat
              icon={<HardDrives size={14} />}
              label="Storage"
              value={bytes(d.storage.bytes)}
              sub={`${d.storage.files} files`}
            />
          </div>

          <Card title="Activity, last 30 days">
            <div
              className="flex h-28 items-end gap-[3px]"
              role="img"
              aria-label={`Active on ${active} of the last 30 days`}
            >
              {d.chart.map((c) => (
                <div key={c.day} className="group relative flex h-full flex-1 items-end">
                  <div
                    className="bg-accent w-full rounded-t-[4px] transition-[height] duration-500"
                    style={{
                      height: `${Math.max(c.n ? 6 : 2, (c.n / max) * 100)}%`,
                      opacity: c.n ? 1 : 0.2,
                    }}
                  />
                  <span className="bg-s3 pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 rounded-md px-2 py-1 text-[11px] whitespace-nowrap group-hover:block">
                    {c.day.slice(5)}: {c.n}
                  </span>
                </div>
              ))}
            </div>
            <div className="text-muted mt-2 flex justify-between text-xs">
              <span>{d.chart[0]?.day.slice(5)}</span>
              <span>Active on {active} of 30 days · messages and clinks</span>
              <span>Today</span>
            </div>
            {Object.keys(d.counts.msgTypes).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {Object.entries(d.counts.msgTypes)
                  .sort((a, b) => b[1] - a[1])
                  .map(([t, n]) => (
                    <span key={t} className="bg-s2 rounded-full px-2.5 py-1 text-xs">
                      {t} <span className="mono text-muted">{n}</span>
                    </span>
                  ))}
              </div>
            )}
          </Card>
        </TabPanel>
      )}

      {tab === "profile" && (
        <TabPanel key="profile" className="grid gap-5 lg:grid-cols-2">
          <Card title="Account">
            <Row k="Joined" v={when(d.account.createdAt)} />
            <Row k="Email confirmed" v={when(d.account.confirmedAt)} />
            <Row
              k="Last sign-in"
              v={`${when(d.account.lastSignInAt)} (${ago(d.account.lastSignInAt)})`}
            />
            <Row
              k="Sign-in methods"
              v={
                <span className="flex items-center justify-end gap-1.5">
                  {d.account.providers.join(", ") || "Email"}
                  {d.account.passkeys > 0 && (
                    <>
                      <Fingerprint size={14} aria-hidden /> {d.account.passkeys} passkey
                      {d.account.passkeys > 1 ? "s" : ""}
                    </>
                  )}
                </span>
              }
            />
            <Row
              k="Temporary password"
              v={d.account.mustChangePassword ? "Yes, must change it at next sign-in" : "No"}
            />
            <Row
              k="Push devices"
              v={
                <span className="flex items-center justify-end gap-1">
                  <DeviceMobile size={14} aria-hidden /> {d.pushDevices}
                </span>
              }
            />
            <Row k="Suspended" v={p?.suspended_at ? when(p.suspended_at) : "No"} />
          </Card>

          <Card title="Profile">
            <Row
              k="Age"
              v={p?.age != null ? `${p.age} (18+ checked at sign-up)` : "Not given yet"}
            />
            <Row
              k="Home"
              v={
                <span className="flex items-center justify-end gap-1">
                  <MapPin size={14} aria-hidden />{" "}
                  {[p?.home_city, p?.country].filter(Boolean).join(", ") || "Not set"}
                </span>
              }
            />
            <Row k="Time zone" v={p?.timezone ?? "Not set"} />
            <Row k="Finished onboarding" v={when(p?.onboarded_at)} />
            <Row k="Presence" v={d.presence?.status?.replace(/^custom:/, "") ?? "Unknown"} />
            <Row
              k="Quiet hours"
              v={
                p?.quiet_start
                  ? `${p.quiet_start.slice(0, 5)} to ${p.quiet_end?.slice(0, 5)}`
                  : "Off"
              }
            />
            <Row k="Discreet mode" v={p?.discreet_mode ? "On" : "Off"} />
          </Card>

          <Card title="Couple">
            {d.couple ? (
              <>
                <Row
                  k="Partner"
                  v={
                    d.couple.partner ? (
                      <Link
                        href={`/admin/users/${d.couple.partner.id}`}
                        className="text-accent hover:underline"
                      >
                        {d.couple.partner.name || "No name yet"} · {d.couple.partner.email}
                      </Link>
                    ) : (
                      "Partner has left"
                    )
                  }
                />
                <Row k="Linked" v={when(d.couple.linkedAt)} />
                <Row k="Together since" v={d.couple.startedOn ?? "Not set"} />
                <Row k="Chat theme" v={d.couple.chatTheme ?? "Clink (default)"} />
                <Row
                  k="Games played"
                  v={`${d.couple.games.total} started, ${d.couple.games.finished} finished, ${d.couple.games.won} won`}
                />
                <Row k="Last game" v={when(d.couple.games.last)} />
                {Object.keys(d.couple.games.byType).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {Object.entries(d.couple.games.byType).map(([t, n]) => (
                      <span key={t} className="bg-s2 rounded-full px-2.5 py-1 text-xs">
                        {GAME_META[t as GameType]?.name ?? t}{" "}
                        <span className="mono text-muted">{n}</span>
                      </span>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted m-0 text-sm">Not linked right now.</p>
            )}
            <Row k="Past couples" v={d.pastCouples} />
          </Card>

          <Card title="Keepsakes and features">
            <Row
              k={
                <span className="flex items-center gap-1.5">
                  <Smiley size={14} aria-hidden /> Mood check-ins
                </span>
              }
              v={d.counts.moodsTotal}
            />
            <Row k="Letters written" v={d.counts.letters} />
            <Row k="Time capsules" v={d.counts.capsules} />
            <Row k="Countdowns" v={d.counts.countdowns} />
            <Row
              k="Photos / videos / voice"
              v={`${d.storage.images} / ${d.storage.videos} / ${d.storage.audio}`}
            />
            <Row
              k={
                <span className="flex items-center gap-1.5">
                  <Moon size={14} aria-hidden /> After Dark
                </span>
              }
              v={
                d.afterDark.optedIn
                  ? `On since ${when(d.afterDark.since)} · ${d.storage.private} private files`
                  : "Off"
              }
            />
          </Card>
        </TabPanel>
      )}

      {tab === "conversation" && (
        <TabPanel key="conversation">
          {d.couple ? (
            <Card title="Conversation">
              <AdminConversation userId={id} />
            </Card>
          ) : (
            <p className="text-muted m-0 text-sm">
              Not linked, so there&apos;s no conversation to open.
            </p>
          )}
        </TabPanel>
      )}

      {tab === "history" && (
        <TabPanel key="history" className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <Card title="Timeline">
            {d.timeline.length ? (
              <ol className="m-0 flex list-none flex-col p-0">
                {d.timeline.map((t, i) => (
                  <li
                    key={i}
                    className="border-line flex items-start gap-3 border-b py-2.5 text-sm last:border-0"
                  >
                    <span
                      className={cn(
                        "mt-1.5 h-2 w-2 flex-none rounded-full",
                        t.byAdmin ? "bg-danger" : "bg-accent",
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      {eventLabel(t.event)}
                      {typeof t.meta?.reason === "string" && (
                        <span className="text-muted block text-xs">Reason: {t.meta.reason}</span>
                      )}
                    </span>
                    <span className="mono text-faint flex flex-none items-center gap-1 text-xs">
                      <Clock size={12} aria-hidden /> {when(t.at)}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-muted m-0 text-sm">Nothing logged for this user yet.</p>
            )}
          </Card>
          <Card title="Reports">
            <div className="text-muted mb-1 flex items-center gap-1.5 text-xs font-medium">
              <ShieldWarning size={14} aria-hidden /> About this user ({d.reports.about.length})
            </div>
            {d.reports.about.length ? (
              d.reports.about.map((r) => (
                <Row
                  key={r.id}
                  k={r.category.replace(/_/g, " ")}
                  v={
                    <Link
                      href={`/admin/reports?id=${r.id}`}
                      className="text-accent hover:underline"
                    >
                      {r.status} · {r.created_at.slice(0, 10)}
                    </Link>
                  }
                />
              ))
            ) : (
              <p className="text-faint m-0 mb-3 text-sm">No reports about this user.</p>
            )}
            <div className="text-muted mt-3 mb-1 flex items-center gap-1.5 text-xs font-medium">
              <Heart size={14} aria-hidden /> Filed by this user ({d.reports.by.length})
            </div>
            {d.reports.by.length ? (
              d.reports.by.map((r) => (
                <Row
                  key={r.id}
                  k={r.category.replace(/_/g, " ")}
                  v={`${r.status} · ${r.created_at.slice(0, 10)}`}
                />
              ))
            ) : (
              <p className="text-faint m-0 text-sm">No reports from this user.</p>
            )}
          </Card>
        </TabPanel>
      )}
      <p className="text-faint m-0 text-xs">
        Opening a conversation needs a reason and is written to the audit log. After Dark content is
        never shown to admins.
      </p>
    </div>
  );
}

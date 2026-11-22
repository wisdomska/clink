import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendMail } from "@/lib/server/mail";
import { sign } from "@/lib/server/crypto";

interface Health {
  errors: {
    total: number;
    kinds: number;
    previous: number;
    top: Array<{ message: string; count: number }>;
  };
  calls: {
    total: number;
    connected: number;
    dropped: number;
    missed: number;
    minutes: number;
    previous_total: number;
    previous_dropped: number;
  };
  pages: {
    views: number;
    avg_ms: number;
    slow_share: number;
    slowest: Array<{
      path: string;
      avg_ms: number;
      slow?: number;
      split?: { server: number; wait: number; fetch: number; render: number } | null;
    }>;
  };
}

const PART_LABEL = {
  server: "the server",
  wait: "waiting to start the main picture",
  fetch: "downloading the main picture",
  render: "drawing and data on the device",
} as const;

/** More than this many slow loads (over 2.5 s) of one screen in a week gets a warning. */
export const SLOW_ALERT_AT = 3;

/**
 * Screens that were slow often enough this week to look into, each with where
 * most of its time went (when the split is known).
 */
export function slowAlerts(h: Pick<Health, "pages">) {
  return h.pages.slowest
    .filter((s) => (s.slow ?? 0) > SLOW_ALERT_AT)
    .map((s) => {
      const parts = s.split
        ? (Object.entries(s.split) as Array<[keyof typeof PART_LABEL, number]>).sort(
            (a, b) => b[1] - a[1],
          )
        : [];
      const top = parts[0];
      return (
        `${s.path} was slow ${s.slow} times (${secs(s.avg_ms)} on average).` +
        (top && top[1] > 0 ? ` Most of it: ${PART_LABEL[top[0]]} (${secs(top[1])}).` : "")
      );
    });
}

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
const secs = (ms: number) => `${(ms / 1000).toFixed(1)} s`;
const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? "https://clinkapp.vercel.app";

/** The week's numbers as an email: plain text and simple HTML. Counts only. */
export function digestEmail(h: Health) {
  const e = h.errors;
  const c = h.calls;
  const p = h.pages;
  const alerts = slowAlerts(h);
  const lines = [
    ...(alerts.length ? ["Worth a look:", ...alerts.map((a) => `  ${a}`), ""] : []),
    `Errors logged: ${e.total} (${e.kinds} different), ${e.previous} the week before.`,
    ...e.top.map((t) => `  ${t.count}x ${t.message.slice(0, 120)}`),
    "",
    `Calls: ${c.connected} connected of ${c.total} (${c.minutes} min talked), ${c.previous_total} the week before.`,
    `  Dropped: ${c.dropped} (${c.previous_dropped} the week before). Missed or declined: ${c.missed}.`,
    "",
    p.views
      ? `Page speed: ${secs(p.avg_ms)} average first load over ${p.views} visits, ${Math.round(p.slow_share * 100)}% slower than 2.5 s.`
      : "Page speed: no visits measured yet.",
    ...p.slowest.slice(0, 3).map((s) => `  ${s.path}: ${secs(s.avg_ms)}`),
    "",
    `Dashboard: ${site()}/admin`,
    `Vercel usage: https://vercel.com/dashboard/usage`,
    "",
    "You get this every Monday. Turn it off on the admin dashboard, next to This week's health.",
  ];
  const row = (label: string, value: string, sub?: string) =>
    `<tr><td style="padding:10px 0;color:#9a9aa5;font-size:14px">${label}</td><td style="padding:10px 0;text-align:right;font:600 20px ui-monospace,Menlo,monospace;color:#f5f5f7">${value}</td></tr>${
      sub
        ? `<tr><td colspan="2" style="padding:0 0 10px;color:#6f6f7a;font-size:13px">${sub}</td></tr>`
        : ""
    }`;
  const list = (items: string[]) =>
    items.length
      ? `<tr><td colspan="2" style="padding:0 0 10px;color:#c5c5cc;font:12px ui-monospace,Menlo,monospace">${items.map(esc).join("<br>")}</td></tr>`
      : "";
  const html = `<!doctype html><html><body style="margin:0;background:#141217;padding:24px;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
<table role="presentation" width="100%" style="max-width:520px;margin:0 auto;background:#1c1a21;border:1px solid #2e2b35;border-radius:16px;padding:24px">
<tr><td colspan="2" style="color:#f5f5f7;font-size:22px;font-weight:700;padding-bottom:4px">This week's health</td></tr>
<tr><td colspan="2" style="color:#9a9aa5;font-size:13px;padding-bottom:12px">Last 7 days, compared with the 7 before.</td></tr>
${
  alerts.length
    ? `<tr><td colspan="2" style="padding:0 0 12px"><div style="background:#2a1d14;border:1px solid #5a3a1e;border-radius:12px;padding:12px 14px;color:#ffd08a;font-size:14px"><strong>Worth a look</strong><br>${alerts.map(esc).join("<br>")}</div></td></tr>`
    : ""
}
${row("Errors logged", String(e.total), `${e.kinds} different, ${e.previous} the week before`)}
${list(e.top.map((t) => `${t.count}x ${t.message.slice(0, 100)}`))}
${row("Calls connected", `${c.connected} of ${c.total}`, `${c.minutes} min talked. Dropped ${c.dropped} (${c.previous_dropped} the week before). Missed or declined ${c.missed}.`)}
${row("Average first load", p.views ? secs(p.avg_ms) : "No data", p.views ? `${p.views} visits, ${Math.round(p.slow_share * 100)}% slower than 2.5 s` : "Fills in as people use Clink.")}
${list(p.slowest.slice(0, 3).map((s) => `${s.path}  ${secs(s.avg_ms)}`))}
<tr><td colspan="2" style="padding-top:16px"><a href="${site()}/admin" style="display:inline-block;background:#ff4f7b;color:#160c10;font-weight:700;text-decoration:none;padding:12px 20px;border-radius:999px">Open the dashboard</a></td></tr>
<tr><td colspan="2" style="padding-top:16px;color:#6f6f7a;font-size:12px">You get this every Monday. Turn it off on the admin dashboard, next to This week's health.</td></tr>
</table></body></html>`;
  const subject = `Clink this week: ${alerts.length ? `${alerts.length} slow ${alerts.length === 1 ? "screen" : "screens"}, ` : ""}${e.total} ${e.total === 1 ? "error" : "errors"}, ${c.connected}/${c.total} calls connected${p.views ? `, ${secs(p.avg_ms)} loads` : ""}`;
  return { subject, text: lines.join("\n"), html };
}

/** Monday (UTC) of the week a date falls in, as YYYY-MM-DD. */
export function weekOf(d: Date) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
  return x.toISOString().slice(0, 10);
}

/**
 * weekly-digest (daily job): on Mondays, email each admin who wants it.
 * `only` sends to one admin right now (the "Send one now" button).
 */
export async function weeklyDigest(opts: { now?: Date; only?: string } = {}) {
  const now = opts.now ?? new Date();
  if (!opts.only && now.getUTCDay() !== 1) return { skipped: "not_monday" };
  const admin = supabaseAdmin();
  let q = admin.from("admin_accounts").select("id, email").eq("weekly_email", true);
  if (opts.only) q = admin.from("admin_accounts").select("id, email").eq("id", opts.only);
  const { data: admins, error } = await q;
  if (error) throw error;
  if (!admins?.length) return { sent: 0 };
  const { data: h, error: e2 } = await admin.rpc("svc_weekly_health", { p_days: 7 });
  if (e2) throw e2;
  const mail = digestEmail(h as unknown as Health);
  const week = weekOf(now);
  let sent = 0;
  for (const a of admins) {
    if (!opts.only) {
      // Claim this week's send first: a second run finds it taken.
      const { error: dup } = await admin.from("admin_digests").insert({ week, admin_id: a.id });
      if (dup) continue;
    }
    const unsubscribe = `${site()}/api/digest/unsubscribe?t=${encodeURIComponent(sign(a.id, "digest-unsubscribe"))}`;
    const r = await sendMail({ to: a.email, ...mail, unsubscribe });
    if (r.sent) sent++;
    else {
      if (!opts.only)
        await admin.from("admin_digests").delete().eq("week", week).eq("admin_id", a.id);
      return { sent, skipped: r.reason };
    }
  }
  return { sent };
}

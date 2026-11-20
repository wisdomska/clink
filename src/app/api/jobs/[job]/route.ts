import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/env";
import {
  expireMedia,
  retryWipes,
  dateReminders,
  capsuleUnlock,
  accountDeletion,
  exportCleanup,
  milestones,
  onThisDay,
  backfillPlaceholders,
} from "@/lib/server/jobs";

export const maxDuration = 60;

function authorised(req: NextRequest): boolean {
  const secret = serverEnv().CRON_SECRET;
  const given = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!secret || given.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(secret));
}

/** Called by Supabase pg_cron through pg_net (every 5 minutes and daily). */
export async function POST(req: NextRequest, ctx: { params: Promise<{ job: string }> }) {
  if (!authorised(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { job } = await ctx.params;
  const started = Date.now();
  const results: Record<string, unknown> = {};
  const run = async (name: string, fn: () => Promise<unknown>) => {
    try {
      results[name] = await fn();
    } catch (e) {
      results[name] = { error: e instanceof Error ? e.message : String(e) };
    }
  };
  if (job === "tick") {
    await run("expire-media", expireMedia);
    await run("unlink-wipe", retryWipes);
    await run("date-reminders", dateReminders);
    await run("capsule-unlock", capsuleUnlock);
    await run("on-this-day", onThisDay);
    await run("placeholder-backfill", () => backfillPlaceholders());
  } else if (job === "daily") {
    await run("account-deletion", accountDeletion);
    await run("export-cleanup", exportCleanup);
    await run("milestones", milestones);
  } else {
    return NextResponse.json({ error: "unknown_job" }, { status: 404 });
  }
  return NextResponse.json(
    { job, ms: Date.now() - started, results },
    { headers: { "Cache-Control": "no-store" } },
  );
}

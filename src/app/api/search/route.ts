import { z } from "zod";
import type { NextRequest } from "next/server";
import { handler, ok, requireCouple, rateLimit, deny } from "@/lib/server/api";

const qSchema = z.string().trim().min(2).max(100);

/** Escape LIKE wildcards so the term matches literally. */
function likePattern(term: string) {
  return `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

/** A short excerpt around the first match, so long letters don't flood the results. */
function excerpt(text: string, term: string, room = 90) {
  const i = text.toLowerCase().indexOf(term.toLowerCase());
  if (i < 0) return text.slice(0, room * 2);
  const start = Math.max(0, i - room / 2);
  return `${start > 0 ? "..." : ""}${text.slice(start, i + term.length + room)}`;
}

/**
 * Global search across the things you can already read. Runs every query under
 * the caller's RLS and the current couple only. It never touches After Dark
 * tables, private (sensitive) media, sealed countdown notes, or letters that
 * are still sealed for you (you only see letters you wrote or have opened).
 */
export const GET = handler(async (req: NextRequest) => {
  const { user, db, coupleId } = await requireCouple();
  await rateLimit(`search:${user.id}`, 240, 3600);
  const parsed = qSchema.safeParse(req.nextUrl.searchParams.get("q") ?? "");
  if (!parsed.success) throw deny(422, "invalid", "Type at least 2 characters.");
  const term = parsed.data;
  const pat = likePattern(term);

  const readableLetters = `author_id.eq.${user.id},opened_at.not.is.null`;
  const [msgs, letterTitles, letterBodies, dates, cdTitles, cdSubs, list] = await Promise.all([
    db
      .from("messages")
      .select("id, sender_id, body, sent_at")
      .eq("couple_id", coupleId)
      .eq("type", "text")
      .is("removed_at", null)
      .ilike("body", pat)
      .order("sent_at", { ascending: false })
      .limit(20),
    db
      .from("letters")
      .select("id, author_id, condition, body, sealed_at, opened_at")
      .eq("couple_id", coupleId)
      .or(readableLetters)
      .ilike("condition", pat)
      .order("sealed_at", { ascending: false })
      .limit(10),
    db
      .from("letters")
      .select("id, author_id, condition, body, sealed_at, opened_at")
      .eq("couple_id", coupleId)
      .or(readableLetters)
      .ilike("body", pat)
      .order("sealed_at", { ascending: false })
      .limit(10),
    db
      .from("scheduled_dates")
      .select("id, kit_id, start_at, status, date_kits!inner(title)")
      .eq("couple_id", coupleId)
      .neq("status", "cancelled")
      .ilike("date_kits.title", pat)
      .order("start_at", { ascending: false })
      .limit(10),
    db
      .from("countdowns_public")
      .select("id, title, subtitle, target_at")
      .eq("couple_id", coupleId)
      .ilike("title", pat)
      .order("target_at", { ascending: false })
      .limit(10),
    db
      .from("countdowns_public")
      .select("id, title, subtitle, target_at")
      .eq("couple_id", coupleId)
      .ilike("subtitle", pat)
      .order("target_at", { ascending: false })
      .limit(10),
    db
      .from("bucket_items")
      .select("id, text, category, done_at")
      .eq("couple_id", coupleId)
      .ilike("text", pat)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const letters = new Map<
    string,
    { id: string; condition: string; snippet: string; mine: boolean; at: string }
  >();
  for (const l of [...(letterTitles.data ?? []), ...(letterBodies.data ?? [])]) {
    // Belt and braces on top of the filter: a letter to you stays sealed until you open it.
    if (l.author_id !== user.id && !l.opened_at) continue;
    if (letters.has(l.id)) continue;
    letters.set(l.id, {
      id: l.id,
      condition: l.condition,
      snippet: excerpt(l.body, term),
      mine: l.author_id === user.id,
      at: l.sealed_at,
    });
  }

  const countdowns = new Map<
    string,
    { id: string; title: string; subtitle: string | null; at: string }
  >();
  for (const c of [...(cdTitles.data ?? []), ...(cdSubs.data ?? [])]) {
    if (!c.id || countdowns.has(c.id)) continue;
    countdowns.set(c.id, {
      id: c.id,
      title: c.title ?? "Countdown",
      subtitle: c.subtitle,
      at: c.target_at ?? "",
    });
  }

  return ok({
    q: term,
    messages: (msgs.data ?? []).map((m) => ({
      id: m.id,
      mine: m.sender_id === user.id,
      snippet: excerpt(m.body ?? "", term),
      at: m.sent_at,
    })),
    letters: [...letters.values()],
    plans: [
      ...(dates.data ?? []).map((d) => ({
        kind: "date" as const,
        id: d.id,
        kitId: d.kit_id,
        title: (d.date_kits as unknown as { title: string } | null)?.title ?? "Date night",
        status: d.status,
        at: d.start_at,
      })),
      ...[...countdowns.values()].map((c) => ({ kind: "countdown" as const, ...c })),
    ],
    list: (list.data ?? []).map((b) => ({
      id: b.id,
      text: b.text,
      category: b.category,
      done: Boolean(b.done_at),
    })),
  });
});

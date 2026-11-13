import { z } from "zod";
import { handler, ok, parseJson, deny } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireDark, tierRank, TIERS } from "@/lib/server/dark";
import { notify } from "@/lib/server/push";

async function load(tier: string) {
  if (!(TIERS as readonly string[]).includes(tier)) throw deny(404, "no_deck", "No such deck.");
  const d = await requireDark({ minRank: tierRank(tier) });
  const admin = supabaseAdmin();
  const { data: deck } = await admin
    .from("decks")
    .select("id, title")
    .eq("tier", tier)
    .eq("enabled", true)
    .single();
  if (!deck) throw deny(404, "no_deck", "No such deck.");
  return { d, admin, deck };
}

/**
 * DARK-03. GET: the current card. A partner's answer is returned only once you
 * have answered the same card too (both reveal together). Passing is free.
 */
export const GET = handler(async (_req, ctx: { params: Promise<{ tier: string }> }) => {
  const { tier } = await ctx.params;
  const { d, admin, deck } = await load(tier);
  const { data: cards } = await admin
    .from("deck_cards")
    .select("id, text, sort")
    .eq("deck_id", deck.id)
    .eq("enabled", true)
    .order("sort");
  const { data: answers } = await admin
    .from("deck_answers")
    .select("card_id, user_id, answer, passed, created_at")
    .eq("couple_id", d.coupleId)
    .in(
      "card_id",
      (cards ?? []).map((c) => c.id),
    );
  const mine = new Map(
    (answers ?? []).filter((a) => a.user_id === d.user.id).map((a) => [a.card_id, a]),
  );
  const theirs = new Map(
    (answers ?? []).filter((a) => a.user_id === d.partnerId).map((a) => [a.card_id, a]),
  );
  // Most recent card I answered whose partner answer just landed: show the reveal.
  const reveal = (answers ?? [])
    .filter(
      (a) =>
        a.user_id === d.user.id &&
        !a.passed &&
        theirs.get(a.card_id) &&
        !theirs.get(a.card_id)!.passed,
    )
    .sort((x, y) => y.created_at.localeCompare(x.created_at))[0];
  const list = cards ?? [];
  const next =
    list.find((c) => !mine.has(c.id) && theirs.get(c.id) && !theirs.get(c.id)!.passed) ??
    list.find((c) => !mine.has(c.id));
  return ok({
    title: deck.title,
    total: list.length,
    position: next ? list.indexOf(next) + 1 : list.length,
    card: next
      ? {
          id: next.id,
          text: next.text,
          partnerAnswered: Boolean(theirs.get(next.id) && !theirs.get(next.id)!.passed),
        }
      : null,
    reveal: reveal
      ? {
          cardId: reveal.card_id,
          text: list.find((c) => c.id === reveal.card_id)?.text,
          mine: reveal.answer,
          theirs: theirs.get(reveal.card_id)!.answer,
        }
      : null,
  });
});

/** POST: answer or pass a card. */
export const POST = handler(async (req, ctx: { params: Promise<{ tier: string }> }) => {
  const { tier } = await ctx.params;
  const { d, admin, deck } = await load(tier);
  const body = await parseJson(
    req,
    z.object({
      cardId: z.uuid(),
      answer: z.string().trim().min(1).max(1000).optional(),
      pass: z.boolean().optional(),
    }),
  );
  const { data: card } = await admin
    .from("deck_cards")
    .select("id")
    .eq("id", body.cardId)
    .eq("deck_id", deck.id)
    .maybeSingle();
  if (!card) throw deny(404, "no_card", "That card isn't in this deck.");
  if (!body.pass && !body.answer) throw deny(422, "empty", "Write something, or pass.");
  await admin.from("deck_answers").upsert(
    {
      couple_id: d.coupleId,
      card_id: body.cardId,
      user_id: d.user.id,
      answer: body.pass ? null : body.answer,
      passed: Boolean(body.pass),
    },
    { onConflict: "couple_id,card_id,user_id" },
  );
  const { data: theirs } = await admin
    .from("deck_answers")
    .select("passed")
    .eq("couple_id", d.coupleId)
    .eq("card_id", body.cardId)
    .eq("user_id", d.partnerId)
    .maybeSingle();
  if (!body.pass && !theirs) await notify(d.partnerId, "dark", { body: "" });
  return ok({ revealed: Boolean(!body.pass && theirs && !theirs.passed) });
});

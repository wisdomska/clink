import { z } from "zod";
import { handler, ok, parseJson, deny } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireDark, tierRank, TIERS } from "@/lib/server/dark";
import { notifyLater } from "@/lib/server/push";

type Answer = { card_id: string; user_id: string; answer: string | null; passed: boolean };

/** One card as each of you sees it. Their answer shows only once you've both answered. */
export interface DeckCard {
  id: string;
  text: string;
  mine: { answer: string | null; passed: boolean } | null;
  theirs: { answered: boolean; passed: boolean; answer: string | null } | null;
}

function shape(
  card: { id: string; text: string },
  mine: Answer | undefined,
  theirs: Answer | undefined,
): DeckCard {
  const revealed = Boolean(mine && !mine.passed && theirs && !theirs.passed);
  return {
    id: card.id,
    text: card.text,
    mine: mine ? { answer: mine.answer, passed: mine.passed } : null,
    theirs: theirs
      ? {
          answered: !theirs.passed,
          passed: theirs.passed,
          answer: revealed ? theirs.answer : null,
        }
      : null,
  };
}

function checkTier(tier: string) {
  if (!(TIERS as readonly string[]).includes(tier)) throw deny(404, "no_deck", "No such deck.");
}

/** The deck's cards in order. Fetched alongside the access check, returned only if it passes. */
function cardsOf(tier: string) {
  return supabaseAdmin()
    .from("deck_cards")
    .select("id, text, sort, decks!inner(tier, enabled, title)")
    .eq("decks.tier", tier)
    .eq("decks.enabled", true)
    .eq("enabled", true)
    .order("sort");
}

/**
 * DARK-03. GET: the whole deck with where each of you is on every card, so you
 * can flip back through past cards. A partner's answer is included only once
 * you have answered the same card too (both reveal together). Passing is free.
 */
export const GET = handler(async (_req, ctx: { params: Promise<{ tier: string }> }) => {
  const { tier } = await ctx.params;
  checkTier(tier);
  const [d, { data: cards }] = await Promise.all([
    requireDark({ minRank: tierRank(tier) }),
    cardsOf(tier),
  ]);
  const list = cards ?? [];
  if (!list.length) throw deny(404, "no_deck", "No such deck.");
  const { data: answers } = await supabaseAdmin()
    .from("deck_answers")
    .select("card_id, user_id, answer, passed")
    .eq("couple_id", d.coupleId)
    .in(
      "card_id",
      list.map((c) => c.id),
    );
  const mine = new Map<string, Answer>();
  const theirs = new Map<string, Answer>();
  for (const a of answers ?? []) (a.user_id === d.user.id ? mine : theirs).set(a.card_id, a);
  const shaped = list.map((c) => shape(c, mine.get(c.id), theirs.get(c.id)));
  // Where to open: a card they've answered and you haven't, else your first unanswered.
  let current = shaped.findIndex((c) => !c.mine && c.theirs?.answered);
  if (current < 0) current = shaped.findIndex((c) => !c.mine);
  const title = (list[0]!.decks as unknown as { title: string }).title;
  return ok({ title, total: list.length, current: current < 0 ? null : current, cards: shaped });
});

/** POST: answer or pass a card (any card, also one you passed earlier). Returns the card's new state. */
export const POST = handler(async (req, ctx: { params: Promise<{ tier: string }> }) => {
  const { tier } = await ctx.params;
  checkTier(tier);
  const body = await parseJson(
    req,
    z.object({
      cardId: z.uuid(),
      answer: z.string().trim().min(1).max(1000).optional(),
      pass: z.boolean().optional(),
    }),
  );
  if (!body.pass && !body.answer) throw deny(422, "empty", "Write something, or pass.");
  const admin = supabaseAdmin();
  const [d, { data: card }] = await Promise.all([
    requireDark({ minRank: tierRank(tier) }),
    admin
      .from("deck_cards")
      .select("id, text, decks!inner(tier)")
      .eq("id", body.cardId)
      .eq("decks.tier", tier)
      .maybeSingle(),
  ]);
  if (!card) throw deny(404, "no_card", "That card isn't in this deck.");
  const mineRow = {
    couple_id: d.coupleId,
    card_id: body.cardId,
    user_id: d.user.id,
    answer: body.pass ? null : (body.answer ?? null),
    passed: Boolean(body.pass),
  };
  const [{ error }, { data: theirs }] = await Promise.all([
    admin.from("deck_answers").upsert(mineRow, { onConflict: "couple_id,card_id,user_id" }),
    admin
      .from("deck_answers")
      .select("card_id, user_id, answer, passed")
      .eq("couple_id", d.coupleId)
      .eq("card_id", body.cardId)
      .eq("user_id", d.partnerId)
      .maybeSingle(),
  ]);
  if (error) throw error;
  if (!body.pass && !theirs) notifyLater(d.partnerId, "dark", { body: "" });
  const next = shape(card, mineRow, theirs ?? undefined);
  return ok({ revealed: Boolean(next.theirs?.answer), card: next });
});

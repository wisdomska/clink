import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { deny } from "@/lib/server/api";
import { shuffle, MoveError, type GameType, type Players, type EngineResult } from "@/features/play/engines/types";
import { knowMeInit, knowMeMove, triviaInit, triviaMove, wyrInit, wyrMove } from "@/features/play/engines/simultaneous";
import { drawInit, drawMove, wordInit, wordMove, storyInit, storyMove } from "@/features/play/engines/turns";
import { isWord } from "@/lib/server/dictionary";
import type { Json } from "@/types/database";

export const LIVE: GameType[] = ["know_me", "draw_guess", "trivia", "wyr"];
export const TURN: GameType[] = ["word", "story"];

async function pick<T>(table: string, cols: string, filter?: (q: ReturnType<ReturnType<typeof supabaseAdmin>["from"]>) => unknown): Promise<T[]> {
  let q = supabaseAdmin().from(table as "wyr_cards").select(cols).eq("enabled", true);
  if (filter) q = filter(q as never) as typeof q;
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as T[];
}

export async function initGame(type: GameType, p: Players, opts: { deck?: string; subject?: string }): Promise<EngineResult<unknown, unknown>> {
  switch (type) {
    case "know_me": {
      const qs = await pick<{ id: number; text: string; options: string[] }>("know_me_questions", "id, text, options");
      return knowMeInit(p, shuffle(qs).slice(0, 10), opts.subject);
    }
    case "trivia": {
      const qs = await pick<{ id: number; category: string; text: string; options: string[]; answer_index: number }>("trivia_questions", "id, category, text, options, answer_index");
      const byCat = new Map<string, typeof qs>();
      for (const q of shuffle(qs)) byCat.set(q.category, [...(byCat.get(q.category) ?? []), q]);
      const chosen: typeof qs = [];
      while (chosen.length < 10) {
        let added = false;
        for (const list of byCat.values()) {
          const q = list.shift();
          if (q && chosen.length < 10) {
            chosen.push(q);
            added = true;
          }
        }
        if (!added) break;
      }
      return triviaInit(p, shuffle(chosen).map((q) => ({ id: q.id, category: q.category, text: q.text, options: q.options, answer: q.answer_index })));
    }
    case "wyr": {
      const deck = opts.deck ?? "Silly";
      const cards = await pick<{ id: number; option_a: string; option_b: string }>("wyr_cards", "id, option_a, option_b", (q) => (q as unknown as { eq: (c: string, v: string) => unknown }).eq("deck", deck));
      return wyrInit(deck, shuffle(cards).slice(0, 10).map((c) => ({ id: c.id, a: c.option_a, b: c.option_b })));
    }
    case "draw_guess": {
      const words = await pick<{ word: string }>("draw_words", "word");
      return drawInit(p, words.map((w) => w.word));
    }
    case "word":
      return wordInit(p);
    case "story": {
      const starters = await pick<{ text: string }>("story_starters", "text");
      return storyInit(p, shuffle(starters)[0]?.text ?? "It started with a missed train.");
    }
  }
}

export function applyMove(type: GameType, p: Players, state: unknown, secrets: unknown, userId: string, move: Record<string, unknown>): EngineResult<unknown, unknown> & { correct?: boolean } {
  try {
    switch (type) {
      case "know_me":
        return knowMeMove(state as never, secrets as never, userId, move as never);
      case "trivia":
        return triviaMove(p, state as never, secrets as never, userId, move as never);
      case "wyr":
        return wyrMove(p, state as never, secrets as never, userId, move as never);
      case "draw_guess":
        return drawMove(p, state as never, secrets as never, userId, move as never);
      case "word":
        return wordMove(p, state as never, userId, move as never, isWord);
      case "story":
        return storyMove(p, state as never, userId, move as never);
    }
  } catch (e) {
    if (e instanceof MoveError) throw deny(422, "bad_move", e.message);
    throw e;
  }
}

export async function playersFor(coupleId: string, starter: string): Promise<Players> {
  const { data } = await supabaseAdmin().from("couple_members").select("user_id, role").eq("couple_id", coupleId).is("left_at", null);
  const a = data?.find((m) => m.role === "a")?.user_id;
  const b = data?.find((m) => m.role === "b")?.user_id;
  if (!a || !b) throw deny(409, "not_linked", "Link with your person first.");
  return { a, b, starter };
}

export const asJson = (v: unknown) => (v ?? {}) as Exclude<Json, null>;

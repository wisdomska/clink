import type { GameType } from "./engines/types";

export const GAME_META: Record<GameType, { name: string; meta: string; mode: "live" | "turn" }> = {
  know_me: { name: "How well do you know me", meta: "10 questions", mode: "live" },
  draw_guess: { name: "Draw and guess", meta: "3 rounds · 60 s", mode: "live" },
  trivia: { name: "Trivia duel", meta: "6 categories", mode: "live" },
  wyr: { name: "Would you rather", meta: "4 decks", mode: "live" },
  word: { name: "Word game", meta: "Any time", mode: "turn" },
  story: { name: "Story builder", meta: "Any time", mode: "turn" },
  rps: { name: "Rock paper scissors", meta: "First to 3", mode: "live" },
  snap: { name: "Snap challenge", meta: "3 prompts · photos", mode: "live" },
  zoom: { name: "Zoom guess", meta: "Guess the close-up", mode: "live" },
  memory: { name: "Photo memory", meta: "Your photos · 6 pairs", mode: "live" },
  oware: { name: "Oware", meta: "Sow, capture, 25 wins", mode: "turn" },
  fourup: { name: "Four Up", meta: "Four in a row", mode: "turn" },
  draughts: { name: "Draughts", meta: "10 by 10 or 8 by 8", mode: "turn" },
};

export async function startGame(
  type: GameType,
  extra: Record<string, unknown> = {},
): Promise<string> {
  const r = await fetch("/api/games", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, ...extra }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.message ?? "Couldn't start that game.");
  return d.id as string;
}

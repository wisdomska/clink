import { describe, it, expect } from "vitest";
import {
  rpsInit,
  rpsMove,
  snapInit,
  snapMove,
  zoomInit,
  zoomMove,
  memoryInit,
  memoryMove,
  closeEnough,
  type MemoryCard,
} from "@/features/play/engines/image";
import { seeded, type Players } from "@/features/play/engines/types";

const p: Players = { a: "A", b: "B", starter: "A" };

describe("rock paper scissors", () => {
  it("seals throws, scores rounds, draws score nothing, first to 3 wins", () => {
    let r = rpsInit(p);
    const play = (a: "rock" | "paper" | "scissors", b: "rock" | "paper" | "scissors") => {
      const one = rpsMove(p, r.state, r.secrets, "A", { pick: a });
      expect(one.state.rounds.length).toBe(r.state.rounds.length); // sealed
      expect(one.state.rounds).toEqual(r.state.rounds);
      expect(one.secrets.pending.A).toBe(a);
      r = rpsMove(p, one.state, one.secrets, "B", { pick: b });
      return r;
    };
    play("rock", "scissors");
    play("paper", "paper");
    expect(r.state.scores).toEqual({ A: 1, B: 0 });
    play("scissors", "rock");
    play("paper", "rock");
    expect(r.finished).toBeFalsy();
    play("scissors", "paper");
    expect(r.finished).toBe(true);
    expect(r.winnerId).toBe("A");
    expect(() => rpsMove(p, r.state, r.secrets, "A", { pick: "lizard" as never })).toThrow();
  });
  it("refuses a second throw in the same round", () => {
    const r = rpsInit(p);
    const one = rpsMove(p, r.state, r.secrets, "A", { pick: "rock" });
    expect(() => rpsMove(p, one.state, one.secrets, "A", { pick: "paper" })).toThrow();
  });
});

describe("snap challenge", () => {
  it("hides photos until both shoot, then scores agreement and kindness", () => {
    let r = snapInit(p, ["one", "two", "three"]);
    const round = (va: string, vb: string) => {
      const s1 = snapMove(p, r.state, r.secrets, "A", { mediaId: "ma" });
      expect(s1.state.shots).toHaveLength(r.state.shots.length);
      const s2 = snapMove(p, s1.state, s1.secrets, "B", { mediaId: "mb" });
      expect(s2.state.phase).toBe("vote");
      expect(s2.state.shots.at(-1)).toEqual({ A: "ma", B: "mb" });
      const v1 = snapMove(p, s2.state, s2.secrets, "A", { vote: va });
      r = snapMove(p, v1.state, v1.secrets, "B", { vote: vb });
    };
    round("A", "A"); // agree on A
    expect(r.state.scores).toEqual({ A: 1, B: 0 });
    round("B", "A"); // each picks the other: both score
    expect(r.state.scores).toEqual({ A: 2, B: 1 });
    round("A", "B"); // each picks themselves: nobody
    expect(r.finished).toBe(true);
    expect(r.winnerId).toBe("A");
  });
});

describe("zoom guess", () => {
  it("zooms out on wrong guesses and scores by how close-up you got it", () => {
    let r = zoomInit(p);
    expect(() => zoomMove(p, r.state, r.secrets, "B", { mediaId: "m", answer: "x" })).toThrow();
    r = zoomMove(p, r.state, r.secrets, "A", {
      mediaId: "m1",
      answer: "The Coffee Mug",
      focus: { x: 0.99, y: 0.1 },
    });
    expect(r.state.rounds[0]!.focus).toEqual({ x: 0.85, y: 0.15 });
    expect(JSON.stringify(r.state)).not.toContain("Coffee");
    const w = zoomMove(p, r.state, r.secrets, "B", { guess: "cup" });
    expect(w.hit).toBe(false);
    expect(w.state.rounds[0]!.level).toBe(1);
    r = zoomMove(p, w.state, w.secrets, "B", { guess: "coffee mugs" });
    expect((r as { hit?: boolean }).hit).toBe(true);
    expect(r.state.scores.B).toBe(4);
    expect(r.state.rounds[0]!.answer).toBe("The Coffee Mug");
    expect(r.state.index).toBe(1);
    // Round 2: B sets, A runs out of guesses.
    r = zoomMove(p, r.state, r.secrets, "B", { mediaId: "m2", answer: "sunset" });
    for (let i = 0; i < 5; i++) r = zoomMove(p, r.state, r.secrets, "A", { guess: "dog" });
    expect(r.finished).toBe(true);
    expect(r.state.rounds[1]!.solved).toBe(false);
    expect(r.winnerId).toBe("B");
  });
  it("forgives case, articles, accents, plurals and small typos", () => {
    expect(closeEnough("the BEACH", "beach")).toBe(true);
    expect(closeEnough("café", "cafe")).toBe(true);
    expect(closeEnough("bananna", "banana")).toBe(true);
    expect(closeEnough("cat", "car")).toBe(false);
    expect(closeEnough("mug", "coffee mug")).toBe(false);
    expect(closeEnough("coffee", "coffee mug")).toBe(true);
  });
});

describe("photo memory", () => {
  const pool: MemoryCard[] = ["1", "2", "3", "4", "5", "6"].map((r) => ({ kind: "media", ref: r }));
  it("keeps the layout secret, matches score and keep the turn, misses pass it", () => {
    let r = memoryInit(p, pool, seeded(3));
    expect(r.state.turn).toBe("B");
    expect(JSON.stringify(r.state)).not.toContain('"ref"');
    const L = r.secrets.layout;
    const pairOf = (i: number) => L.findIndex((c, j) => j !== i && c.ref === L[i]!.ref);
    const miss = L.findIndex((c, j) => j > 0 && c.ref !== L[0]!.ref);
    // B misses: turn passes to A.
    r = memoryMove(p, r.state, r.secrets, "B", { flip: 0 });
    expect(r.state.faces[0]).toEqual(L[0]);
    r = memoryMove(p, r.state, r.secrets, "B", { flip: miss });
    expect(r.state.turn).toBe("A");
    expect(() => memoryMove(p, r.state, r.secrets, "B", { flip: 1 })).toThrow();
    // A clears the board, pair by pair, keeping the turn.
    const done = new Set<number>();
    for (let i = 0; i < L.length; i++) {
      if (done.has(i)) continue;
      const j = pairOf(i);
      r = memoryMove(p, r.state, r.secrets, "A", { flip: i });
      r = memoryMove(p, r.state, r.secrets, "A", { flip: j });
      expect(r.state.last?.match).toBe(true);
      done.add(i).add(j);
    }
    expect(r.finished).toBe(true);
    expect(r.state.scores).toEqual({ A: 6, B: 0 });
    expect(r.winnerId).toBe("A");
  });
});

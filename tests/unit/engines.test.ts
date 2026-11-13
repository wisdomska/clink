import { describe, it, expect } from "vitest";
import {
  knowMeInit,
  knowMeMove,
  triviaInit,
  triviaMove,
  wyrInit,
  wyrMove,
} from "@/features/play/engines/simultaneous";
import {
  drawInit,
  drawMove,
  normaliseGuess,
  wordInit,
  wordMove,
  traceable,
  wordPoints,
  storyInit,
  storyMove,
  TURN_SECONDS,
} from "@/features/play/engines/turns";
import { MoveError, seeded, shuffle, other } from "@/features/play/engines/types";

const P = { a: "A", b: "B", starter: "A" };
const q = (i: number) => ({ id: i, text: `Q${i}`, options: ["w", "x", "y", "z"] });

describe("How well do you know me", () => {
  it("seals answers until both are in, then scores matches", () => {
    let r = knowMeInit(
      P,
      Array.from({ length: 10 }, (_, i) => q(i)),
    );
    expect(r.state.subject).toBe("B");
    for (let i = 0; i < 10; i++) {
      r = { ...r, ...knowMeMove(r.state, r.secrets, "B", { pick: 1 }) };
      expect(JSON.stringify(r.state)).not.toContain('"pending"');
      expect(r.state.reveals.length).toBe(i);
      r = { ...r, ...knowMeMove(r.state, r.secrets, "A", { pick: i < 7 ? 1 : 2 }) };
    }
    expect(r.state.score).toBe(7);
    expect(r.finished).toBe(true);
    expect(r.winnerId).toBe("A");
  });
  it("refuses double answers, outsiders and bad picks", () => {
    const r = knowMeInit(
      P,
      Array.from({ length: 10 }, (_, i) => q(i)),
    );
    const r2 = knowMeMove(r.state, r.secrets, "A", { pick: 0 });
    expect(() => knowMeMove(r2.state, r2.secrets, "A", { pick: 0 })).toThrow(MoveError);
    expect(() => knowMeMove(r.state, r.secrets, "C", { pick: 0 })).toThrow(MoveError);
    expect(() => knowMeMove(r.state, r.secrets, "A", { pick: 4 })).toThrow(MoveError);
    expect(() => knowMeInit(P, [q(1)])).toThrow(MoveError);
  });
});

describe("Trivia duel", () => {
  const qs = Array.from({ length: 10 }, (_, i) => ({ ...q(i), category: "Food", answer: i % 4 }));
  it("never exposes answers in public state and picks a winner", () => {
    let r = triviaInit(P, qs);
    expect(JSON.stringify(r.state)).not.toContain("answer");
    for (let i = 0; i < 10; i++) {
      r = { ...r, ...triviaMove(P, r.state, r.secrets, "A", { pick: i % 4 }) };
      r = { ...r, ...triviaMove(P, r.state, r.secrets, "B", { pick: 0 }) };
    }
    expect(r.state.scores).toEqual({ A: 10, B: 3 });
    expect(r.winnerId).toBe("A");
    expect(() => triviaMove(P, r.state, r.secrets, "A", { pick: 0 })).toThrow(MoveError);
  });
  it("calls a draw on equal scores", () => {
    let r = triviaInit(P, qs);
    for (let i = 0; i < 10; i++) {
      r = { ...r, ...triviaMove(P, r.state, r.secrets, "A", { pick: 0 }) };
      r = { ...r, ...triviaMove(P, r.state, r.secrets, "B", { pick: 0 }) };
    }
    expect(r.isDraw).toBe(true);
    expect(r.winnerId).toBeNull();
  });
});

describe("Would you rather", () => {
  it("counts matches", () => {
    let r = wyrInit(
      "Silly",
      Array.from({ length: 6 }, (_, i) => ({ id: i, a: "a", b: "b" })),
    );
    for (let i = 0; i < 6; i++) {
      r = { ...r, ...wyrMove(P, r.state, r.secrets, "A", { pick: "a" }) };
      r = { ...r, ...wyrMove(P, r.state, r.secrets, "B", { pick: i % 2 ? "a" : "b" }) };
    }
    expect(r.state.matches).toBe(3);
    expect(r.finished).toBe(true);
    expect(() => wyrInit("Silly", [])).toThrow(MoveError);
  });
});

describe("Draw and guess", () => {
  const words = ["moon", "cat", "boat", "tree", "kite", "fish", "lamp"];
  it("scores faster guesses higher and alternates drawers", () => {
    const t0 = new Date("2026-11-13T21:00:00Z");
    let r = drawInit(P, words, t0, seeded(1));
    expect(r.state.drawer).toBe("A");
    const word = r.secrets.words[0]!;
    expect(drawMove(P, r.state, r.secrets, "B", { guess: "nope" }, t0).correct).toBe(false);
    expect(() => drawMove(P, r.state, r.secrets, "A", { guess: word }, t0)).toThrow(MoveError);
    const fast = drawMove(
      P,
      r.state,
      r.secrets,
      "B",
      { guess: ` ${word.toUpperCase()} ` },
      new Date(t0.getTime() + 6000),
    );
    expect(fast.correct).toBe(true);
    expect(fast.state.scores.B).toBe(91);
    expect(fast.state.scores.A).toBe(46);
    expect(fast.state.drawer).toBe("B");
    r = { ...r, ...fast };
    for (let t = 1; t < 6; t++) {
      const later = new Date(new Date(r.state.turnStartedAt).getTime() + (TURN_SECONDS + 3) * 1000);
      expect(() =>
        drawMove(
          P,
          r.state,
          r.secrets,
          other(P, r.state.drawer),
          { timeout: true },
          new Date(r.state.turnStartedAt),
        ),
      ).toThrow(MoveError);
      r = { ...r, ...drawMove(P, r.state, r.secrets, "A", { timeout: true }, later) };
    }
    expect(r.finished).toBe(true);
    expect(r.winnerId).toBe("B");
    expect(normaliseGuess("  Hot-Air  Balloon!")).toBe("hotair balloon");
  });
});

describe("Word board", () => {
  const board = ["C", "A", "T", "S", "X", "R", "E", "X", "X", "X", "D", "X", "QU", "I", "T", "X"];
  it("traces words through touching tiles without reuse", () => {
    expect(traceable(board, "cat")).toBe(true);
    expect(traceable(board, "cats")).toBe(true);
    expect(traceable(board, "care")).toBe(true);
    expect(traceable(board, "quit")).toBe(true);
    expect(traceable(board, "catt")).toBe(false);
    expect(traceable(board, "dog")).toBe(false);
  });
  it("scores by length", () => {
    expect([2, 3, 4, 5, 6, 7, 8, 10].map((n) => wordPoints("a".repeat(n)))).toEqual([
      0, 1, 2, 4, 6, 9, 11, 15,
    ]);
  });
  it("enforces turns, uniqueness and the dictionary; two passes end it", () => {
    const dict = new Set(["cat", "cats", "care"]);
    let r = { ...wordInit(P, seeded(3)), state: { ...wordInit(P, seeded(3)).state, board } };
    expect(() => wordMove(P, r.state, "B", { word: "cat" }, (w) => dict.has(w))).toThrow(MoveError);
    r = { ...r, ...wordMove(P, r.state, "A", { word: "cats" }, (w) => dict.has(w)) };
    expect(r.state.scores.A).toBe(2);
    expect(r.notifyTurn).toBe("B");
    expect(() => wordMove(P, r.state, "B", { word: "cats" }, (w) => dict.has(w))).toThrow(
      MoveError,
    );
    expect(() => wordMove(P, r.state, "B", { word: "rex" }, () => false)).toThrow(MoveError);
    expect(() => wordMove(P, r.state, "B", { word: "xx" }, () => true)).toThrow(MoveError);
    r = { ...r, ...wordMove(P, r.state, "B", { pass: true }, () => true) };
    r = { ...r, ...wordMove(P, r.state, "A", { pass: true }, () => true) };
    expect(r.finished).toBe(true);
    expect(r.winnerId).toBe("A");
  });
});

describe("Story builder", () => {
  it("alternates lines and can be ended after four", () => {
    let r = storyInit(P, "Once upon a train...");
    expect(() => storyMove(P, r.state, "B", { line: "Nope" })).toThrow(MoveError);
    expect(() => storyMove(P, r.state, "A", { end: true })).toThrow(MoveError);
    for (const who of ["A", "B", "A", "B"])
      r = { ...r, ...storyMove(P, r.state, who, { line: `${who} line` }) };
    expect(r.state.lines.length).toBe(4);
    expect(() => storyMove(P, r.state, "A", { line: "x" })).toThrow(MoveError);
    r = { ...r, ...storyMove(P, r.state, "A", { end: true }) };
    expect(r.finished).toBe(true);
    expect(() => storyMove(P, r.state, "B", { line: "more" })).toThrow(MoveError);
  });
  it("stops at 40 lines", () => {
    let r = storyInit(P, "Go");
    for (let i = 0; i < 40; i++)
      r = { ...r, ...storyMove(P, r.state, i % 2 ? "B" : "A", { line: `line ${i}` }) };
    expect(r.finished).toBe(true);
    expect(r.state.ended).toBe(true);
  });
});

describe("helpers", () => {
  it("shuffles deterministically with a seed", () => {
    expect(shuffle([1, 2, 3, 4, 5], seeded(7))).toEqual(shuffle([1, 2, 3, 4, 5], seeded(7)));
    expect(shuffle([1, 2, 3, 4, 5], seeded(7)).sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

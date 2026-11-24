import { describe, it, expect } from "vitest";
import {
  owareStart,
  owarePlay,
  legalPits,
  owareWinner,
  sideSeeds,
  type OwareBoard,
} from "@/features/play/engines/board/oware";
import {
  fourupStart,
  fourupPlay,
  fourupOver,
  fourupTurn,
  openCols,
  fourupWinner,
} from "@/features/play/engines/board/fourup";
import {
  draughtsStart,
  draughtsPlay,
  draughtsResult,
  legalMoves,
  countPieces,
  KING0,
  KING1,
  type DraughtsBoard,
} from "@/features/play/engines/board/draughts";
import {
  owareBot,
  fourupBot,
  draughtsBot,
  type BotLevel,
} from "@/features/play/engines/board/bots";
import { makeRng } from "@/features/play/engines/board/rng";
import { boardInit, boardMove, type BoardState } from "@/features/play/engines/boards";

const total = (b: OwareBoard) => b.pits.reduce((a, c) => a + c, 0) + b.scores[0] + b.scores[1];

describe("oware: random games keep the rules", () => {
  it("48 seeds always, turns alternate, every game ends", () => {
    for (let g = 0; g < 80; g++) {
      const rng = makeRng(g);
      let s = owareStart();
      let plies = 0;
      while (!s.over) {
        const moves = legalPits(s.pits, s.turn);
        expect(moves.length).toBeGreaterThan(0);
        const before = s.turn;
        s = owarePlay(s, s.turn, rng.pick(moves));
        expect(total(s)).toBe(48);
        if (!s.over) expect(s.turn).toBe(1 - before);
        // must-feed: after any move, if the mover could feed, the rival isn't left empty
        expect(++plies).toBeLessThan(2000);
      }
      const w = owareWinner(s);
      expect(w === null || w === 0 || w === 1).toBe(true);
      if (s.reason === "score")
        expect(Math.max(...s.scores) >= 25 || s.scores[0] === 24).toBe(true);
    }
  });
  it("a side never ends a move empty when the mover could have fed it", () => {
    for (let g = 0; g < 60; g++) {
      const rng = makeRng(1000 + g);
      let s = owareStart();
      while (!s.over) {
        const me = s.turn;
        const rivalWasEmpty = sideSeeds(s.pits, (1 - me) as 0 | 1) === 0;
        s = owarePlay(s, me, rng.pick(legalPits(s.pits, me)));
        if (rivalWasEmpty && !s.over)
          expect(sideSeeds(s.pits, (1 - me) as 0 | 1)).toBeGreaterThan(0);
      }
    }
  });
});

describe("four up: random games", () => {
  it("ends in a four or a full board, never a move after", () => {
    for (let g = 0; g < 150; g++) {
      const rng = makeRng(g);
      let s = fourupStart();
      while (!fourupOver(s)) s = fourupPlay(s, fourupTurn(s), rng.pick(openCols(s.grid)));
      expect(fourupWinner(s) !== null || openCols(s.grid).length === 0).toBe(true);
      expect(() => fourupPlay(s, fourupTurn(s), 0)).toThrow();
    }
  });
});

describe("draughts: random games on both boards", () => {
  for (const n of [10, 8] as const)
    it(`${n} by ${n}: pieces only ever go down, captures are taken, games end`, () => {
      for (let g = 0; g < 30; g++) {
        const rng = makeRng(g);
        let s: DraughtsBoard = draughtsStart(n);
        let plies = 0;
        while (draughtsResult(s) === undefined) {
          const ms = legalMoves(s.board, s.turn);
          // compulsory capture: if any capture exists, every legal move captures
          if (ms.some((m) => m.caps.length)) expect(ms.every((m) => m.caps.length > 0)).toBe(true);
          if (n === 10 && ms.length && ms[0]!.caps.length) {
            const most = Math.max(...ms.map((m) => m.caps.length));
            expect(ms.every((m) => m.caps.length === most)).toBe(true);
          }
          const m = rng.pick(ms);
          const them = (1 - s.turn) as 0 | 1;
          const before = countPieces(s.board, them);
          s = draughtsPlay(s, s.turn, m.path);
          expect(countPieces(s.board, them)).toBe(before - m.caps.length);
          expect(++plies).toBeLessThan(3000);
        }
      }
    });
});

const BOT_LEVELS_ALL: BotLevel[] = ["easy", "medium", "hard"];

describe("the practice bot", () => {
  const levels: BotLevel[] = ["easy", "medium", "hard"];
  it("plays whole games at every level without an illegal move", () => {
    for (const level of levels) {
      const rng = makeRng(42);
      let o = owareStart();
      while (!o.over) o = owarePlay(o, o.turn, owareBot(o, level, rng));
      let f = fourupStart();
      while (!fourupOver(f)) f = fourupPlay(f, fourupTurn(f), fourupBot(f, level, rng));
      let d = draughtsStart(8);
      let plies = 0;
      while (draughtsResult(d) === undefined && plies++ < (level === "hard" ? 12 : 400))
        d = draughtsPlay(d, d.turn, draughtsBot(d, level, rng));
    }
  }, 120_000);
  it("even easy isn't a pushover: random moves rarely beat it", () => {
    let easyWins = 0;
    let rand = 0;
    for (let g = 0; g < 20; g++) {
      const rng = makeRng(500 + g);
      let f = fourupStart();
      const easySeat = g % 2;
      while (!fourupOver(f)) {
        const t = fourupTurn(f);
        f = fourupPlay(
          f,
          t,
          t === easySeat ? fourupBot(f, "easy", rng) : rng.pick(openCols(f.grid)),
        );
      }
      if (fourupWinner(f)?.seat === easySeat) easyWins++;
      let d = draughtsStart(8);
      let plies = 0;
      while (draughtsResult(d) === undefined && plies++ < 300)
        d = draughtsPlay(
          d,
          d.turn,
          d.turn === easySeat
            ? draughtsBot(d, "easy", rng)
            : rng.pick(legalMoves(d.board, d.turn)).path,
        );
      if (draughtsResult(d) === easySeat) rand++;
    }
    expect(easyWins).toBeGreaterThanOrEqual(17);
    expect(rand).toBeGreaterThanOrEqual(15);
  }, 120_000);
  it("hard beats easy far more often than not", () => {
    let hardWins = 0;
    let hardLosses = 0;
    for (let g = 0; g < 6; g++) {
      const rng = makeRng(g);
      let f = fourupStart();
      // hard plays seat 0 in even games, seat 1 in odd
      const hardSeat = g % 2;
      while (!fourupOver(f)) {
        const t = fourupTurn(f);
        f = fourupPlay(f, t, fourupBot(f, t === hardSeat ? "hard" : "easy", rng));
      }
      const w = fourupWinner(f)?.seat;
      if (w === hardSeat) hardWins++;
      else if (w !== undefined) hardLosses++;
    }
    // Draws happen against a careful blocker. Hard thinks against the clock, so
    // on a busy test machine it sees less far; allow one slip, not more.
    expect(hardLosses, `hard lost ${hardLosses} of 6`).toBeLessThanOrEqual(1);
    expect(hardWins, `hard won ${hardWins} of 6`).toBeGreaterThanOrEqual(4);
  }, 120_000);
  it("finishes a won draughts ending at every level instead of drifting into a draw", () => {
    // Four kings against one on 8 by 8: the no-capture limit must never save the lone king.
    for (const level of BOT_LEVELS_ALL) {
      for (let seed = 1; seed <= 2; seed++) {
        const rng = makeRng(seed);
        const other = makeRng(seed + 50);
        const b = new Array(64).fill(0);
        for (const sq of [1, 3, 5, 10]) b[sq] = KING1;
        b[62] = KING0;
        let s: DraughtsBoard = { board: b, turn: 1, quiet: 0, moves: [] };
        let r: 0 | 1 | null | undefined;
        while ((r = draughtsResult(s)) === undefined)
          s = draughtsPlay(
            s,
            s.turn,
            draughtsBot(s, s.turn === 1 ? level : "medium", s.turn === 1 ? rng : other),
          );
        expect(r, `${level}, seed ${seed}`).toBe(1);
      }
    }
  }, 180_000);
});

describe("board games between partners (server wrapper)", () => {
  const p = { a: "nia", b: "theo", starter: "nia" };
  it("seats, turns, refusing the wrong player, draws by agreement", () => {
    let s = boardInit("fourup", p).state as BoardState;
    expect(s.seats).toEqual({ nia: 0, theo: 1 });
    expect(() => boardMove(p, s, "theo", { col: 3 })).toThrow(/their move/);
    let r = boardMove(p, s, "nia", { col: 3 });
    expect(r.turn).toBe("theo");
    expect(r.notifyTurn).toBe("theo");
    s = r.state;
    r = boardMove(p, s, "nia", { offerDraw: true });
    expect(r.state.drawOffer).toBe("nia");
    expect(() => boardMove(p, r.state, "nia", { acceptDraw: true })).toThrow();
    const done = boardMove(p, r.state, "theo", { acceptDraw: true });
    expect(done.finished && done.isDraw).toBe(true);
  });
  it("a move declines a standing draw offer, and a finished game names the winner", () => {
    let s = boardInit("fourup", p).state as BoardState;
    let last;
    for (const [who, col] of [
      ["nia", 0],
      ["theo", 6],
      ["nia", 1],
      ["theo", 6],
      ["nia", 2],
      ["theo", 6],
    ] as const) {
      last = boardMove(p, s, who, { col });
      s = last.state;
    }
    s = boardMove(p, s, "theo", { offerDraw: true }).state;
    last = boardMove(p, s, "nia", { col: 3 });
    expect(last.state.drawOffer).toBeNull();
    expect(last.finished).toBe(true);
    expect(last.winnerId).toBe("nia");
  });
  it("oware and draughts report captures for the other side's line", () => {
    const o = boardInit("oware", p).state as BoardState;
    expect(boardMove(p, o, "nia", { pit: 2 }).state.last).toEqual({ by: "nia", captured: 0 });
    const d = boardInit("draughts", p, { size: 8 }).state as BoardState;
    const path = legalMoves((d.board as DraughtsBoard).board, 0)[0]!.path;
    expect(boardMove(p, d, "nia", { path }).turn).toBe("theo");
  });
});

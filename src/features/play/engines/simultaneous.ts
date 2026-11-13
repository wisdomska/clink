import { MoveError, other, type EngineResult, type Players } from "./types";

/* ---------------------------------------------------------------------------
 * How Well Do You Know Me (PLAY-02). 10 questions a round. The subject answers
 * about themselves, the guesser guesses. Answers stay sealed until both are in.
 * ------------------------------------------------------------------------- */
export interface KnowMeQuestion {
  id: number;
  text: string;
  options: string[];
}
export interface KnowMeState {
  subject: string;
  guesser: string;
  questions: KnowMeQuestion[];
  index: number;
  submitted: string[]; // who has submitted for the current question
  reveals: Array<{ answer: number; guess: number }>;
  score: number;
}
export interface KnowMeSecrets {
  pending: Record<string, number>;
}

export function knowMeInit(
  p: Players,
  questions: KnowMeQuestion[],
  subject = p.starter === p.a ? p.b : p.a,
): EngineResult<KnowMeState, KnowMeSecrets> {
  if (questions.length < 10) throw new MoveError("Not enough questions.");
  return {
    state: {
      subject,
      guesser: other(p, subject),
      questions: questions.slice(0, 10),
      index: 0,
      submitted: [],
      reveals: [],
      score: 0,
    },
    secrets: { pending: {} },
    turn: null,
  };
}

export function knowMeMove(
  s: KnowMeState,
  x: KnowMeSecrets,
  userId: string,
  move: { pick: number },
): EngineResult<KnowMeState, KnowMeSecrets> {
  if (s.reveals.length >= s.questions.length) throw new MoveError("This round is over.");
  if (userId !== s.subject && userId !== s.guesser) throw new MoveError("Not your game.");
  if (!Number.isInteger(move.pick) || move.pick < 0 || move.pick > 3)
    throw new MoveError("Pick one of the four.");
  if (s.submitted.includes(userId)) throw new MoveError("Already answered.");
  const pending = { ...x.pending, [userId]: move.pick };
  const submitted = [...s.submitted, userId];
  if (submitted.length < 2) return { state: { ...s, submitted }, secrets: { pending } };
  const answer = pending[s.subject]!;
  const guess = pending[s.guesser]!;
  const reveals = [...s.reveals, { answer, guess }];
  const score = s.score + (answer === guess ? 1 : 0);
  const done = reveals.length === s.questions.length;
  return {
    state: { ...s, reveals, score, submitted: [], index: done ? s.index : s.index + 1 },
    secrets: { pending: {} },
    finished: done,
    // The guesser "wins" the round with 6 or more; otherwise the subject does.
    winnerId: done ? (score >= 6 ? s.guesser : s.subject) : undefined,
    scores: { [s.guesser]: score },
  };
}

/* ---------------------------------------------------------------------------
 * Trivia duel (PLAY-04). 10 questions across 6 categories, both answer at once.
 * ------------------------------------------------------------------------- */
export interface TriviaQuestion {
  id: number;
  category: string;
  text: string;
  options: string[];
}
export interface TriviaState {
  questions: TriviaQuestion[];
  index: number;
  submitted: string[];
  reveals: Array<{ correct: number; picks: Record<string, number> }>;
  scores: Record<string, number>;
}
export interface TriviaSecrets {
  answers: number[];
  pending: Record<string, number>;
}

export function triviaInit(
  p: Players,
  questions: Array<TriviaQuestion & { answer: number }>,
): EngineResult<TriviaState, TriviaSecrets> {
  if (questions.length < 10) throw new MoveError("Not enough questions.");
  const qs = questions.slice(0, 10);
  return {
    state: {
      questions: qs.map(({ answer: _a, ...q }) => q),
      index: 0,
      submitted: [],
      reveals: [],
      scores: { [p.a]: 0, [p.b]: 0 },
    },
    secrets: { answers: qs.map((q) => q.answer), pending: {} },
    turn: null,
  };
}

export function triviaMove(
  p: Players,
  s: TriviaState,
  x: TriviaSecrets,
  userId: string,
  move: { pick: number },
): EngineResult<TriviaState, TriviaSecrets> {
  if (s.reveals.length >= s.questions.length) throw new MoveError("This duel is over.");
  if (userId !== p.a && userId !== p.b) throw new MoveError("Not your game.");
  if (!Number.isInteger(move.pick) || move.pick < 0 || move.pick > 3)
    throw new MoveError("Pick one of the four.");
  if (s.submitted.includes(userId)) throw new MoveError("Already answered.");
  const pending = { ...x.pending, [userId]: move.pick };
  const submitted = [...s.submitted, userId];
  if (submitted.length < 2) return { state: { ...s, submitted }, secrets: { ...x, pending } };
  const correct = x.answers[s.index]!;
  const scores = { ...s.scores };
  for (const id of [p.a, p.b]) if (pending[id] === correct) scores[id] = (scores[id] ?? 0) + 1;
  const reveals = [...s.reveals, { correct, picks: pending }];
  const done = reveals.length === s.questions.length;
  const sa = scores[p.a] ?? 0;
  const sb = scores[p.b] ?? 0;
  return {
    state: { ...s, reveals, scores, submitted: [], index: done ? s.index : s.index + 1 },
    secrets: { ...x, pending: {} },
    finished: done,
    winnerId: done ? (sa === sb ? null : sa > sb ? p.a : p.b) : undefined,
    isDraw: done && sa === sb,
    scores,
  };
}

/* ---------------------------------------------------------------------------
 * Would You Rather / This or That (PLAY-05). Both answer; matches are shown.
 * ------------------------------------------------------------------------- */
export interface WyrCard {
  id: number;
  a: string;
  b: string;
}
export interface WyrState {
  deck: string;
  cards: WyrCard[];
  index: number;
  submitted: string[];
  reveals: Array<Record<string, "a" | "b">>;
  matches: number;
}
export interface WyrSecrets {
  pending: Record<string, "a" | "b">;
}

export function wyrInit(deck: string, cards: WyrCard[]): EngineResult<WyrState, WyrSecrets> {
  if (cards.length < 5) throw new MoveError("Not enough cards.");
  return {
    state: { deck, cards: cards.slice(0, 10), index: 0, submitted: [], reveals: [], matches: 0 },
    secrets: { pending: {} },
    turn: null,
  };
}

export function wyrMove(
  p: Players,
  s: WyrState,
  x: WyrSecrets,
  userId: string,
  move: { pick: "a" | "b" },
): EngineResult<WyrState, WyrSecrets> {
  if (s.reveals.length >= s.cards.length) throw new MoveError("That deck is done.");
  if (userId !== p.a && userId !== p.b) throw new MoveError("Not your game.");
  if (move.pick !== "a" && move.pick !== "b") throw new MoveError("Pick one.");
  if (s.submitted.includes(userId)) throw new MoveError("Already picked.");
  const pending = { ...x.pending, [userId]: move.pick };
  const submitted = [...s.submitted, userId];
  if (submitted.length < 2) return { state: { ...s, submitted }, secrets: { pending } };
  const matches = s.matches + (pending[p.a] === pending[p.b] ? 1 : 0);
  const reveals = [...s.reveals, pending];
  const done = reveals.length === s.cards.length;
  return {
    state: { ...s, reveals, matches, submitted: [], index: done ? s.index : s.index + 1 },
    secrets: { pending: {} },
    finished: done,
    winnerId: null,
    isDraw: done,
  };
}

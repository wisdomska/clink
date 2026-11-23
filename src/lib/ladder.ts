/**
 * The daily ladder's rules, shared by the server (which checks every answer)
 * and the device (which checks as you type). Four-letter words; each step
 * changes exactly one letter.
 */
export const LADDER_LEN = 4;
export const MAX_STEPS = 20;

export const oneApart = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++;
  return diff === 1;
};

/** Why a ladder doesn't hold, or null when it does (dictionary checked by `isWord`). */
export function ladderProblem(
  path: string[],
  start: string,
  target: string,
  isWord: (w: string) => boolean,
): string | null {
  if (path.length < 2 || path.length > MAX_STEPS + 1) return "That ladder is the wrong length.";
  if (path[0] !== start) return `Start from ${start.toUpperCase()}.`;
  if (path[path.length - 1] !== target) return `End on ${target.toUpperCase()}.`;
  for (let i = 1; i < path.length; i++) {
    const w = path[i]!;
    if (!/^[a-z]{4}$/.test(w)) return "Four letters a step.";
    if (!oneApart(path[i - 1]!, w)) return `${w.toUpperCase()} changes more than one letter.`;
    if (!isWord(w)) return `${w.toUpperCase()} isn't in the dictionary.`;
  }
  return null;
}

/** Steps compared with par, for the result line. */
export function parLine(steps: number, par: number) {
  if (steps === par) return "Par. Perfect.";
  if (steps < par) return `${par - steps} under par!`;
  return `${steps - par} over par`;
}

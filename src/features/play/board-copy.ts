/**
 * Words for the board games: how to play, and how a game ended, in plain
 * language. Shared by real games and practice against Clink.
 */
import type { BoardType } from "./engines/boards";
import type { OwareBoard } from "./engines/board/oware";
import type { DraughtsBoard } from "./engines/board/draughts";
import { countPieces, legalMoves, sizeOf } from "./engines/board/draughts";

export const RULES: Record<BoardType, { intro: string; rules: string[] }> = {
  oware: {
    intro:
      "Ghana's national board game (Abapa rules). Two rows of six pits, four seeds in each. Your row is the one nearest you.",
    rules: [
      "On your turn, pick one of your pits. All its seeds are sown one by one into the next pits, going right along your row and back along theirs.",
      "If your last seed lands in one of their pits and makes it 2 or 3, you capture those seeds. Then check the pit before it: if that's theirs and also holds 2 or 3, take it too, and so on back along their row.",
      "A pit with 12 or more seeds goes all the way round and skips the pit it came from.",
      "Grand slam: a move that would take every seed on their side is allowed, but captures nothing.",
      "If their row is empty you must give them seeds if any move can. If none can, the game ends and you keep the seeds on your side.",
      "First to 25 seeds wins. 24 each is a draw. If the seeds go round in circles with no capture for a long time, each side keeps what's on its own row.",
    ],
  },
  fourup: {
    intro: "A board of 7 columns and 6 rows. You and your partner take turns dropping a disc.",
    rules: [
      "Tap a column: your disc falls to the lowest empty space in it.",
      "Four of your discs in a line wins: across, up and down, or diagonally.",
      "If the board fills up with no line of four, it's a draw.",
      "Watch their threats: blocking a line of three is often the best move.",
    ],
  },
  draughts: {
    intro:
      "Pieces sit on the dark squares; yours start nearest you. Choose 10 by 10 (international rules, played across Africa) or 8 by 8 (English rules) when you start.",
    rules: [
      "Tap one of your pieces, then the square it moves to. Pieces move one square diagonally forward.",
      "Capture by jumping diagonally over an opponent's piece to the empty square behind it. Captures are compulsory: if you can take, you must. Pieces that can take glow.",
      "Keep jumping in one move while you can: tap each landing square in turn.",
      "10 by 10: pieces may also capture backwards, and you must take the line that captures the most pieces.",
      "Reach the far row to be crowned a king. 10 by 10 kings fly any distance along a diagonal; 8 by 8 kings move one square in any direction.",
      "You win when your partner has no pieces left or can't move. A long run with no captures is a draw, and you can agree a draw any time.",
    ],
  },
};

/** Why a game ended, from your side ("Clink" or your partner's name for theirs). */
export function endingLine(
  kind: BoardType,
  board: unknown,
  mySeat: 0 | 1,
  winnerSeat: 0 | 1 | null,
  theirName: string,
  reason?: string,
): string {
  if (reason === "agreed a draw") return "You agreed a draw.";
  if (kind === "fourup")
    return winnerSeat === null
      ? "The board filled up with no line of four."
      : winnerSeat === mySeat
        ? "Four in a row: yours."
        : `Four in a row for ${theirName}.`;
  if (kind === "oware") {
    const b = board as OwareBoard;
    const mine = b.scores[mySeat];
    const theirs = b.scores[(1 - mySeat) as 0 | 1];
    if (b.reason === "no moves")
      return `No move could give the other side seeds, so each side kept its own. Final: ${mine} to ${theirs}.`;
    if (b.reason === "cycle")
      return `The seeds went round with no capture for 100 moves, so each side kept its own. Final: ${mine} to ${theirs}.`;
    return winnerSeat === null
      ? "24 seeds each: a draw."
      : `${winnerSeat === mySeat ? "You" : theirName} reached 25 seeds. ${mine} to ${theirs}.`;
  }
  const d = board as DraughtsBoard;
  if (winnerSeat === null)
    return sizeOf(d.board) === 10
      ? "25 moves each with only kings and no capture: a draw."
      : "40 moves each with no capture or crowning: a draw.";
  const loser = (1 - winnerSeat) as 0 | 1;
  const who = loser === mySeat ? "You" : theirName;
  if (!countPieces(d.board, loser))
    return `${who} ${loser === mySeat ? "have" : "has"} no pieces left.`;
  if (!legalMoves(d.board, loser).length)
    return `${who} ${loser === mySeat ? "have" : "has"} no move left.`;
  return reason ? `Ended by ${reason}.` : "";
}

import type { BoardState } from "./engines/boards";

/** "3 h", "2 days": how long a move has been waiting. */
export function waited(fromIso: string, now: Date) {
  const m = Math.max(0, Math.round((now.getTime() - Date.parse(fromIso)) / 60_000));
  if (m < 1) return "just now";
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h`;
  return `${Math.round(h / 24)} days`;
}

/** The lobby line for a board game: "Theo captured 4 · 22 h ago". */
export function boardLine(s: BoardState, meId: string, partnerName: string, now: Date) {
  const last = s.last;
  const what =
    last && last.captured
      ? `${last.by === meId ? "You" : partnerName} captured ${last.captured}`
      : last
        ? `${last.by === meId ? "You" : partnerName} moved`
        : "Not started";
  const offer = s.drawOffer && s.drawOffer !== meId ? ` · ${partnerName} offers a draw` : "";
  return `${what} · ${waited(s.lastMoveAt, now)}${last ? " ago" : ""}${offer}`;
}

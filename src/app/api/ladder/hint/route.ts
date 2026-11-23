import type { NextRequest } from "next/server";
import { handler, ok, requireCouple, rateLimit, deny } from "@/lib/server/api";
import { hintStep, ladderFor } from "@/lib/server/ladder";

/** "Show me a step": the next everyday word from where you are towards today's target. */
export const GET = handler(async (req: NextRequest) => {
  const { user } = await requireCouple();
  await rateLimit(`ladder-hint:${user.id}`, 120, 3600);
  const day = req.nextUrl.searchParams.get("day") ?? "";
  const from = (req.nextUrl.searchParams.get("from") ?? "").toLowerCase();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^[a-z]{4}$/.test(from))
    throw deny(400, "bad_request", "Which word?");
  if (Math.abs(Date.parse(`${day}T12:00:00Z`) - Date.now()) / 86400_000 > 1.6)
    throw deny(400, "bad_day", "That's not today.");
  const puzzle = await ladderFor(day);
  return ok({ next: hintStep(from, puzzle.target) });
});

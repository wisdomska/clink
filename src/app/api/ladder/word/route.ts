import type { NextRequest } from "next/server";
import { handler, ok, requireUser, rateLimit } from "@/lib/server/api";
import { isWord } from "@/lib/server/dictionary";

/** Is this a word? For the daily ladder, checked as each step is typed. */
export const GET = handler(async (req: NextRequest) => {
  const { user } = await requireUser();
  await rateLimit(`ladder-word:${user.id}`, 600, 3600);
  const w = (req.nextUrl.searchParams.get("w") ?? "").toLowerCase();
  return ok({ word: /^[a-z]{4}$/.test(w) && isWord(w) });
});

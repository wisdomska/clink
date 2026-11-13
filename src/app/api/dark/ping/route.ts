import { handler, ok } from "@/lib/server/api";
import { requireDark } from "@/lib/server/dark";

/** Activity heartbeat: keeps the 2-minute idle window sliding while someone is actually using After Dark. */
export const POST = handler(async () => {
  const d = await requireDark();
  return ok({ rank: d.rank });
});

import type { NextRequest } from "next/server";
import { handler, ok, requireUser } from "@/lib/server/api";
import { landingFor } from "@/lib/server/journey";

/** Where to go after a password sign-in (admins: /admin). */
export const GET = handler(async (req: NextRequest) => {
  const { user } = await requireUser();
  return ok({ to: await landingFor(user.id, req.nextUrl.searchParams.get("next")) });
});

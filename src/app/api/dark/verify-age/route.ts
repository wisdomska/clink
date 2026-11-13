import { z } from "zod";
import { handler, ok, parseJson, requireCouple, rateLimit, deny, audit } from "@/lib/server/api";
import { ageVerifier, DECLARATION } from "@/lib/server/age-verification";

/** POST /api/dark/verify-age: starts age verification through the configured adapter. */
export const POST = handler(async (req) => {
  const { user } = await requireCouple();
  await rateLimit(`verify-age:${user.id}`, 5, 3600);
  const { declaration } = await parseJson(req, z.object({ declaration: z.string().max(400) }));
  const r = await ageVerifier().start(user.id, { declaration });
  await audit("age_verification", user.id, { status: r.status });
  if (r.status === "failed")
    throw deny(
      403,
      r.reason ?? "failed",
      r.reason === "under_18" ? "Unhinged is for adults only." : "That didn't verify.",
    );
  return ok(r);
});

export async function GET() {
  return Response.json({ declaration: DECLARATION });
}

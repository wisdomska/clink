import { z } from "zod";
import { handler, ok, parseJson, requireCouple, deny, rateLimit } from "@/lib/server/api";
import { sign, unsign } from "@/lib/server/crypto";
import { endCouple } from "@/lib/server/wipe";
import { notify } from "@/lib/server/push";

const schema = z.union([
  z.object({ step: z.literal("start") }),
  z.object({ step: z.literal("confirm"), token: z.string().min(10) }),
]);

/**
 * POST /api/couple/unlink: two-step. "start" returns a 5-minute signed token,
 * "confirm" with that token ends the couple and wipes sensitive media (SAF-05).
 */
export const POST = handler(async (req) => {
  const { user, coupleId, partnerId } = await requireCouple();
  await rateLimit(`unlink:${user.id}`, 10, 3600);
  const body = await parseJson(req, schema);
  if (body.step === "start") {
    return ok({ token: sign(`${user.id}|${coupleId}|${Date.now() + 5 * 60 * 1000}`, "unlink") });
  }
  const v = unsign(body.token, "unlink");
  const [uid, cid, exp] = v?.split("|") ?? [];
  if (uid !== user.id || cid !== coupleId || Number(exp) < Date.now())
    throw deny(400, "bad_token", "That took too long. Start again.");
  await endCouple(coupleId, "unlink", user.id);
  await notify(partnerId, "clinks", { body: "Your Clink link has ended.", url: "/link" });
  return ok({ ok: true });
});

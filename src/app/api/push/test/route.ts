import { handler, ok, requireUser, rateLimit, deny } from "@/lib/server/api";
import { notifyTest } from "@/lib/server/push";

/**
 * POST /api/push/test: send a test notification to each of my devices and say,
 * per device, whether the push service took it (and why not, if not).
 */
export const POST = handler(async () => {
  const { user } = await requireUser();
  await rateLimit(`pushtest:${user.id}`, 10, 3600);
  const results = await notifyTest(user.id);
  if (results === "no_vapid")
    throw deny(503, "no_vapid", "Notifications aren't set up on the server.");
  return ok({ results });
});

import { z } from "zod";
import { handler, ok, parseJson, requireCouple } from "@/lib/server/api";
import { serverEnv } from "@/lib/env";

/**
 * Decline from the notification (the app may be closed): tell the caller over
 * the couple's realtime channel, the same message the app would have sent.
 */
export const POST = handler(async (req) => {
  const { coupleId } = await requireCouple();
  const { id } = await parseJson(req, z.object({ id: z.uuid() }));
  const env = serverEnv();
  await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      messages: [
        {
          topic: `couple:${coupleId}`,
          event: "call:end",
          payload: { id, reason: "declined" },
          private: true,
        },
      ],
    }),
  });
  return ok({ ok: true });
});

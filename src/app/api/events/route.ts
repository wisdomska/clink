import { z } from "zod";
import { sessionUser } from "@/lib/server/api";
import { track } from "@/lib/server/analytics";

const schema = z.object({
  name: z.string().max(40),
  props: z.record(z.string(), z.unknown()).optional(),
});

/** Client-side events that only the browser knows about (e.g. pwa_installed). */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response(null, { status: 204 });
  const user = await sessionUser();
  await track(parsed.data.name, user?.id ?? null, parsed.data.props ?? {});
  return new Response(null, { status: 204 });
}

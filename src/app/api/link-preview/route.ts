import type { NextRequest } from "next/server";
import { handler, ok, requireCouple, rateLimit, deny } from "@/lib/server/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { cleanUrl, fetchPreview } from "@/lib/server/link-preview";

const FRESH = 7 * 86_400_000;
const RETRY_FAILED = 86_400_000;

/**
 * GET ?url= : the preview card for a link sent in chat. Fetched by the server
 * once and cached for everyone, so devices never contact the linked site.
 * Never for After Dark (the card is never shown there either).
 */
export const GET = handler(async (req: NextRequest) => {
  const { user } = await requireCouple();
  const referer = req.headers.get("referer");
  if (referer && /^\/dark(\/|$)/.test(new URL(referer).pathname))
    throw deny(403, "private", "No previews in After Dark.");
  const u = cleanUrl(req.nextUrl.searchParams.get("url") ?? "");
  if (!u) throw deny(400, "bad_url", "That link can't be previewed.");
  const url = u.toString();
  const admin = supabaseAdmin();
  const { data: hit } = await admin.from("link_previews").select("*").eq("url", url).maybeSingle();
  const age = hit ? Date.now() - new Date(hit.fetched_at).getTime() : Infinity;
  const cache = { headers: { "Cache-Control": "private, max-age=86400" } };
  if (hit && age < (hit.ok ? FRESH : RETRY_FAILED)) return ok(view(hit), cache);

  await rateLimit(`link-preview:${user.id}`, 60, 3600);
  const p = await fetchPreview(u);
  const row = { url, ...p, fetched_at: new Date().toISOString() };
  // A link that worked before and blips now keeps its old card.
  if (p.ok || !hit?.ok) await admin.from("link_previews").upsert(row);
  return ok(view(p.ok || !hit ? row : hit), cache);
});

function view(r: {
  ok: boolean;
  title: string | null;
  description: string | null;
  site: string | null;
  image: string | null;
}) {
  return r.ok
    ? { ok: true, title: r.title, description: r.description, site: r.site, image: r.image }
    : { ok: false };
}

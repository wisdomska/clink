import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Clears a session whose account no longer exists (deleted, or the token
 * outlived the user), then goes to sign-in. Without this, a still-valid token
 * for a deleted user bounced between /us and /login forever.
 */
export async function GET(req: NextRequest) {
  const next = req.nextUrl.searchParams.get("next") ?? "/us";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/us";
  const db = await supabaseServer();
  await db.auth.signOut({ scope: "local" }).catch(() => undefined);
  const to = new URL("/login", req.url);
  to.searchParams.set("next", safeNext);
  const res = NextResponse.redirect(to);
  // Belt and braces: drop any Supabase auth cookie the sign-out missed.
  for (const c of req.cookies.getAll())
    if (c.name.startsWith("sb-")) res.cookies.set(c.name, "", { path: "/", maxAge: 0 });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

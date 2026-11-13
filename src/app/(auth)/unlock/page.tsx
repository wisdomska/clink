import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { appLockEnabled, isAppUnlocked, signedInRecently } from "@/lib/server/app-lock";
import { UnlockScreen } from "./unlock-screen";

export const metadata: Metadata = { title: "Locked", robots: { index: false } };
export const dynamic = "force-dynamic";

function safeNext(n: string | undefined) {
  return n && n.startsWith("/") && !n.startsWith("//") ? n : "/us";
}

export default async function UnlockPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeNext((await searchParams).next);
  const db = await supabaseServer();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (!(await appLockEnabled(user.id)) || (await isAppUnlocked(user.id))) redirect(next);
  // Just signed in again (proved who they are): allow turning a forgotten PIN off.
  const fresh = signedInRecently(user.last_sign_in_at);
  return <UnlockScreen next={next} fresh={fresh} />;
}

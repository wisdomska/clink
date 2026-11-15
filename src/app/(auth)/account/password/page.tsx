import type { Metadata } from "next";
import { PasswordScreen } from "./password-screen";
import { supabaseServer } from "@/lib/supabase/server";
import { landingFor } from "@/lib/server/journey";

export const metadata: Metadata = { title: "Password", robots: { index: false } };

export default async function PasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ forced?: string; next?: string }>;
}) {
  const sp = await searchParams;
  const asked = sp.next?.startsWith("/") && !sp.next.startsWith("//") ? sp.next : null;
  const { data } = await (await supabaseServer()).auth.getUser();
  const next = data.user ? await landingFor(data.user.id, asked) : (asked ?? "/us");
  return <PasswordScreen forced={sp.forced === "1"} next={next} email={data.user?.email ?? ""} />;
}

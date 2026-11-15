import type { Metadata } from "next";
import { PasswordScreen } from "./password-screen";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Password", robots: { index: false } };

export default async function PasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ forced?: string; next?: string }>;
}) {
  const sp = await searchParams;
  const next = sp.next?.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/us";
  const { data } = await (await supabaseServer()).auth.getUser();
  return <PasswordScreen forced={sp.forced === "1"} next={next} email={data.user?.email ?? ""} />;
}

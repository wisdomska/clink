import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { journeyStep } from "@/lib/server/journey";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { activeCouple } from "@/lib/server/api";
import { LinkScreen } from "./link-screen";
import { isVerified } from "@/lib/server/verified";
import { readOnlyArchive } from "@/lib/server/archive";

export const metadata: Metadata = { title: "Link your person" };

export default async function LinkPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; enter?: string; linked?: string }>;
}) {
  const db = await supabaseServer();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login?next=/link");
  const sp = await searchParams;
  const step = await journeyStep(user.id);
  if (step === "dob" || step === "profile")
    redirect(`/onboarding?next=${encodeURIComponent(`/link${sp.code ? `?code=${sp.code}` : ""}`)}`);
  const admin = supabaseAdmin();
  const { data: me } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();
  if (step === "app") {
    if (!sp.linked) redirect("/us");
    const couple = await activeCouple(user.id);
    const { data: p } = await admin
      .from("profiles")
      .select("display_name")
      .eq("id", couple!.partnerId)
      .single();
    return (
      <LinkScreen me={me?.display_name ?? ""} initialPartner={p?.display_name ?? ""} startLinked />
    );
  }
  const verified = isVerified(user);
  const archive = await readOnlyArchive(user.id);
  return (
    <LinkScreen
      me={me?.display_name ?? ""}
      userId={user.id}
      prefillCode={sp.code ?? null}
      focusEnter={Boolean(sp.enter)}
      verified={verified}
      archive={archive && { partner: archive.partner, until: archive.until }}
    />
  );
}

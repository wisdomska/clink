import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { journeyStep } from "@/lib/server/journey";
import { type Gender, DEFAULT_AVATAR } from "@/lib/avatars";
import { Onboarding } from "./onboarding";

export const metadata: Metadata = { title: "Set up" };

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; edit?: string }>;
}) {
  const db = await supabaseServer();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/auth/reset?next=/onboarding");
  const step = await journeyStep(user.id);
  const { next, edit } = await searchParams;
  const editing = Boolean(edit) && step !== "dob";
  if (!editing && step === "link") redirect(next?.startsWith("/link") ? next : "/link");
  if (!editing && step === "app") redirect("/us");
  const { data: profile } = await db
    .from("profiles")
    .select("display_name, avatar_icon, home_city, timezone, gender")
    .eq("id", user.id)
    .single();
  return (
    <Onboarding
      needsDob={step === "dob"}
      initialName={
        profile?.display_name ??
        (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
        ""
      }
      initialIcon={profile?.avatar_icon ?? DEFAULT_AVATAR}
      initialGender={(profile?.gender as Gender | null) ?? null}
      next={next ?? null}
      editing={editing}
    />
  );
}

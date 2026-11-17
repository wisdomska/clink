import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { CapsuleScreen } from "@/features/keep/capsule";

export const metadata: Metadata = { title: "Time capsule" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await supabaseServer();
  const { data } = await db
    .from("capsules")
    .select("id, title, unlock_at, opened_at, created_at, author_id")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  return <CapsuleScreen capsule={data} />;
}

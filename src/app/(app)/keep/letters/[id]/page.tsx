import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { LetterScreen } from "@/features/keep/letter";

export const metadata: Metadata = { title: "Open When" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === "new") redirect("/keep?write=letter");
  const db = await supabaseServer();
  const { data } = await db
    .from("letters")
    .select("id, author_id, condition, body, sealed_at, opened_at")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  return <LetterScreen letter={data} />;
}

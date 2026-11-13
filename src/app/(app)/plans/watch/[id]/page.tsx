import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { WatchRoom } from "@/features/plans/watch-room";

export const metadata: Metadata = { title: "Watch party" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await supabaseServer();
  const { data } = await db
    .from("watch_sessions")
    .select("id, video_id, title, created_by")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  return <WatchRoom session={data} />;
}

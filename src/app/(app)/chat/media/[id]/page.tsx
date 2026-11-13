import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { MediaViewer } from "@/features/chat/media-viewer";

export const metadata: Metadata = { title: "Media" };

export default async function MediaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await supabaseServer();
  const { data: m } = await db
    .from("media")
    .select("id, kind, mime, duration_s, waveform, is_favourite, owner_id, created_at, deleted_at")
    .eq("id", id)
    .maybeSingle();
  if (!m) notFound();
  return <MediaViewer media={m} />;
}

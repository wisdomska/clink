import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { activeCouple, sessionUser } from "@/lib/server/api";
import { SensitiveViewer } from "@/features/dark/viewer";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await sessionUser();
  const [couple, { data: m }] = await Promise.all([
    user ? activeCouple(user.id) : null,
    supabaseAdmin()
      .from("media")
      .select("id, owner_id, kind, retention, couple_id, is_sensitive")
      .eq("id", id)
      .maybeSingle(),
  ]);
  if (!user || !couple || !m || !m.is_sensitive || m.couple_id !== couple.coupleId) notFound();
  return (
    <SensitiveViewer
      id={m.id}
      mine={m.owner_id === user.id}
      kind={m.kind}
      retention={m.retention}
    />
  );
}

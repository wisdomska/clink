import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { activeCouple } from "@/lib/server/api";
import { SensitiveViewer } from "@/features/dark/viewer";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await supabaseServer();
  const {
    data: { user },
  } = await db.auth.getUser();
  const couple = user ? await activeCouple(user.id) : null;
  const { data: m } = await supabaseAdmin()
    .from("media")
    .select("id, owner_id, kind, retention, couple_id, is_sensitive")
    .eq("id", id)
    .maybeSingle();
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

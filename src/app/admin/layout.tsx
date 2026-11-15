import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { QueryProvider } from "@/features/couple/query-provider";
import { AdminRail } from "@/features/admin/rail";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

/** /admin: signed in and is_admin in the database, checked on every request. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = ((await headers()).get("x-pathname") ?? "/admin").split("?")[0]!;
  const db = await supabaseServer();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  const { data: p } = await supabaseAdmin()
    .from("profiles")
    .select("is_admin, display_name")
    .eq("id", user.id)
    .single();
  if (!p?.is_admin) notFound();
  return (
    <QueryProvider>
      <div className="bg-app min-h-dvh lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
        <AdminRail name={p.display_name ?? user.email ?? "admin"} />
        <main className="min-w-0 px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-16 md:px-8 lg:px-10 lg:pt-8">
          {children}
        </main>
      </div>
    </QueryProvider>
  );
}

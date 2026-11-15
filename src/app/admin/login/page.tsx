import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/server/admin-auth";
import { AdminLogin } from "@/features/admin/login";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false } };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const next =
    sp.next?.startsWith("/admin") && !sp.next.startsWith("/admin/login") ? sp.next : "/admin";
  if (await currentAdmin()) redirect(next);
  return <AdminLogin next={next} />;
}

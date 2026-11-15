import type { Metadata } from "next";
import { AdminAccountForm } from "@/features/admin/account";

export const metadata: Metadata = { title: "Admin password", robots: { index: false } };

export default async function AdminPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const next = sp.next?.startsWith("/admin") ? sp.next : "/admin";
  return (
    <main className="mx-auto flex min-h-dvh max-w-[440px] flex-col justify-center px-5 py-10">
      <AdminAccountForm forced next={next} />
    </main>
  );
}

import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { QueryProvider } from "@/features/couple/query-provider";
import { AdminRail } from "@/features/admin/rail";
import { currentAdmin } from "@/lib/server/admin-auth";
import { MotionRoot } from "@/components/clink/motion-root";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

/**
 * /admin has its own sign-in (admin accounts, not Clink accounts), checked on
 * every request. A temporary password must be replaced first.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  return <MotionRoot>{await AdminFrame({ children })}</MotionRoot>;
}

async function AdminFrame({ children }: { children: React.ReactNode }) {
  const path = ((await headers()).get("x-pathname") ?? "/admin").split("?")[0]!;
  if (path === "/admin/login") return <div className="bg-app min-h-dvh">{children}</div>;
  const admin = await currentAdmin();
  if (!admin) redirect(`/admin/login?next=${encodeURIComponent(path)}`);
  if (admin.must_change_password && path !== "/admin/password")
    redirect(`/admin/password?next=${encodeURIComponent(path)}`);
  if (path === "/admin/password")
    return (
      <QueryProvider>
        <div className="bg-app min-h-dvh">{children}</div>
      </QueryProvider>
    );
  return (
    <QueryProvider>
      <div className="bg-app min-h-dvh lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
        <AdminRail
          name={
            admin.name && admin.name !== "Admin" ? `${admin.name} · ${admin.email}` : admin.email
          }
        />
        <main className="min-w-0 px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-16 md:px-8 lg:px-10 lg:pt-8">
          {children}
        </main>
      </div>
    </QueryProvider>
  );
}

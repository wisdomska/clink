"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChartBar, Users, Flag, Books, SlidersHorizontal, ListMagnifyingGlass, List, X, SignOut } from "@phosphor-icons/react";
import { cn } from "@/components/ui/cn";

const ITEMS = [
  { href: "/admin", label: "Dashboard", Icon: ChartBar },
  { href: "/admin/users", label: "Users and couples", Icon: Users },
  { href: "/admin/reports", label: "Reports", Icon: Flag },
  { href: "/admin/content", label: "Content library", Icon: Books },
  { href: "/admin/settings", label: "Settings", Icon: SlidersHorizontal },
  { href: "/admin/audit", label: "Audit log", Icon: ListMagnifyingGlass },
] as const;

export function AdminRail({ name }: { name: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const nav = (
    <nav aria-label="Admin" className="flex flex-col gap-1">
      {ITEMS.map(({ href, label, Icon }) => {
        const on = href === "/admin" ? path === "/admin" : path.startsWith(href);
        return (
          <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={on ? "page" : undefined} className={cn("press flex h-11 items-center gap-3 rounded-full px-3 text-sm font-medium", on ? "bg-s1 text-text hover:text-text" : "text-muted hover:bg-s1 hover:text-text")}>
            <span className="flex h-[28px] w-10 items-center justify-center rounded-full" style={{ background: on ? "var(--accent)" : "transparent", color: on ? "var(--on-accent)" : "currentColor" }}>
              <Icon size={20} aria-hidden />
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
  return (
    <>
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-app px-4 pt-[calc(env(safe-area-inset-top)+8px)] pb-2 lg:hidden">
        <span className="display text-[24px]">
          clink <span className="mono text-xs text-faint">ADMIN</span>
        </span>
        <button type="button" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)} className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-line bg-transparent text-text">
          {open ? <X size={20} /> : <List size={20} />}
        </button>
      </div>
      {open && <div className="border-b border-line bg-app p-3 lg:hidden">{nav}</div>}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line px-3 py-6 lg:flex">
        <div className="display mb-1 px-3 text-[30px]">clink</div>
        <div className="mono mb-8 px-3 text-xs text-faint">ADMIN · NO CONTENT ACCESS</div>
        {nav}
        <div className="mt-auto flex flex-col gap-2 px-3">
          <div className="truncate text-xs text-faint">{name}</div>
          <button type="button" onClick={async () => { await fetch("/api/auth/signout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); window.location.href = "/"; }} className="flex cursor-pointer items-center gap-2 bg-transparent text-sm text-muted">
            <SignOut size={16} aria-hidden /> Sign out
          </button>
        </div>
      </aside>
    </>
  );
}

"use client";
import Link from "@/components/ui/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "@/components/ui/toast";
import { AdminFetchError } from "./fetch";
import { AdminCommands } from "./command";
import {
  ChartBar,
  Users,
  Flag,
  Books,
  SlidersHorizontal,
  ListMagnifyingGlass,
  Bug,
  Palette,
  List,
  MagnifyingGlass,
  X,
  SignOut,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import { cn } from "@/components/ui/cn";
import { Logo } from "@/components/brand/logo";

const ITEMS = [
  { href: "/admin", label: "Dashboard", Icon: ChartBar },
  { href: "/admin/users", label: "Users", Icon: Users },
  { href: "/admin/reports", label: "Reports", Icon: Flag },
  { href: "/admin/content", label: "Content library", Icon: Books },
  { href: "/admin/settings", label: "Settings", Icon: SlidersHorizontal },
  { href: "/admin/audit", label: "Audit log", Icon: ListMagnifyingGlass },
  { href: "/admin/errors", label: "Errors", Icon: Bug },
  { href: "/admin/brand", label: "Brand", Icon: Palette },
] as const;

export function AdminRail({ name }: { name: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  // Admin actions that fail without their own handler still tell you why.
  useEffect(() => {
    const on = (e: PromiseRejectionEvent) => {
      if (e.reason instanceof AdminFetchError) {
        e.preventDefault();
        toast.err(e.reason.message);
      }
    };
    window.addEventListener("unhandledrejection", on);
    return () => window.removeEventListener("unhandledrejection", on);
  }, []);
  const nav = (
    <nav aria-label="Admin" className="flex flex-col gap-1">
      {ITEMS.map(({ href, label, Icon }) => {
        const on = href === "/admin" ? path === "/admin" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            aria-current={on ? "page" : undefined}
            className={cn(
              "press rounded-input relative flex h-10 items-center gap-3 px-3 text-sm font-medium",
              on ? "text-text hover:text-text" : "text-muted hover:bg-s1 hover:text-text",
            )}
          >
            {on && (
              <motion.span
                layoutId="admin-rail-active"
                className="bg-s2 border-line rounded-input absolute inset-0 border"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                aria-hidden
              />
            )}
            <span className={cn("relative flex items-center", on && "text-accent")}>
              <Icon size={18} weight={on ? "fill" : "regular"} aria-hidden />
            </span>
            <span className="relative">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
  return (
    <>
      <div className="border-line bg-app sticky top-0 z-20 flex items-center justify-between border-b px-4 pt-[calc(env(safe-area-inset-top)+8px)] pb-2 lg:hidden">
        <span className="flex items-center gap-2">
          <Logo size={22} />
          <AdminChip />
        </span>
        <span className="flex items-center gap-2">
          <AdminCommands
            trigger={(openPalette) => (
              <button
                type="button"
                aria-label="Search and go to"
                onClick={openPalette}
                className="border-line text-text flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border bg-transparent"
              >
                <MagnifyingGlass size={20} />
              </button>
            )}
          />
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen(!open)}
            className="border-line text-text flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border bg-transparent"
          >
            {open ? <X size={20} /> : <List size={20} />}
          </button>
        </span>
      </div>
      {open && <div className="border-line bg-app border-b p-3 lg:hidden">{nav}</div>}
      <aside className="border-line sticky top-0 hidden h-dvh flex-col border-r px-3 py-6 lg:flex">
        <div className="mb-6 flex items-center gap-2 px-3">
          <Logo size={26} />
          <AdminChip />
        </div>
        <button
          type="button"
          onClick={() =>
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))
          }
          className="border-line text-muted hover:text-text hover:border-line-strong rounded-input mb-4 flex h-11 cursor-pointer items-center gap-2 border bg-transparent px-3 text-sm"
        >
          <MagnifyingGlass size={16} aria-hidden />
          <span className="flex-1 text-left">Search</span>
          <kbd className="mono text-faint text-[11px]">Ctrl K</kbd>
        </button>
        {nav}
        <div className="mt-auto flex flex-col gap-2 px-3">
          <div className="text-faint truncate text-xs" title={name}>
            Signed in as {name}
          </div>
          <button
            type="button"
            onClick={async () => {
              await fetch("/api/admin/auth/logout", { method: "POST" });
              window.location.href = "/admin/login";
            }}
            className="text-muted flex cursor-pointer items-center gap-2 bg-transparent text-sm"
          >
            <SignOut size={16} aria-hidden /> Sign out
          </button>
        </div>
      </aside>
    </>
  );
}

function AdminChip() {
  return (
    <span className="border-line-strong text-muted rounded-full border px-2 py-0.5 text-xs font-medium">
      Admin
    </span>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Books,
  ChartBar,
  Flag,
  ListMagnifyingGlass,
  MagnifyingGlass,
  SlidersHorizontal,
  User,
  Users,
} from "@phosphor-icons/react";
import { cn } from "@/components/ui/cn";
import { adminFetch } from "./fetch";

const PAGES = [
  { href: "/admin", label: "Dashboard", keys: "g d", Icon: ChartBar },
  { href: "/admin/users", label: "Users and couples", keys: "g u", Icon: Users },
  { href: "/admin/reports", label: "Reports", keys: "g r", Icon: Flag },
  { href: "/admin/content", label: "Content library", keys: "g c", Icon: Books },
  { href: "/admin/settings", label: "Settings", keys: "g s", Icon: SlidersHorizontal },
  { href: "/admin/audit", label: "Audit log", keys: "g a", Icon: ListMagnifyingGlass },
] as const;
const GO: Record<string, string> = Object.fromEntries(
  PAGES.map((p) => [p.keys.split(" ")[1]!, p.href]),
);

const SHORTCUTS: Array<[string, string]> = [
  ["Ctrl K or ⌘ K", "Open the command palette"],
  ["g then d", "Go to the dashboard"],
  ["g then u", "Go to users and couples"],
  ["g then r", "Go to reports"],
  ["g then c", "Go to the content library"],
  ["g then s", "Go to settings"],
  ["g then a", "Go to the audit log"],
  ["/", "Search on this page"],
  ["?", "Show these shortcuts"],
];

interface Hit {
  id: string;
  email: string;
  name: string | null;
}

/** True when a key press should go to a text field, not a shortcut. */
function typing(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  if (!el) return false;
  return (
    el.isContentEditable ||
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT"
  );
}

const panel =
  "an-fade border-line bg-s1 fixed top-[12dvh] left-1/2 z-[61] flex max-h-[76dvh] w-[calc(100vw-32px)] max-w-[600px] -translate-x-1/2 flex-col overflow-hidden rounded-[20px] border shadow-[0_8px_24px_rgba(0,0,0,.35)] outline-none";

/**
 * The admin shell's keyboard layer: Ctrl/Cmd+K command palette (jump to a page
 * or find a person by email or name), "g" then a letter to go to a page, "/"
 * to focus the page's search, and "?" for the list of shortcuts.
 */
export function AdminCommands({ trigger }: { trigger?: (open: () => void) => React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [text, setText] = useState("");
  const [term, setTerm] = useState("");
  const [active, setActive] = useState(0);
  const pendingG = useRef(0);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listId = "admin-cmd-list";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setHelp(false);
        setOpen((v) => !v);
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return;
      if (document.querySelector("[role=dialog]")) return;
      if (pendingG.current && Date.now() - pendingG.current < 1200) {
        pendingG.current = 0;
        const href = GO[e.key.toLowerCase()];
        if (href) {
          e.preventDefault();
          router.push(href);
        }
        return;
      }
      if (e.key === "g") {
        pendingG.current = Date.now();
      } else if (e.key === "/") {
        const box = document.querySelector<HTMLInputElement>("[data-admin-search]");
        e.preventDefault();
        if (box) {
          box.focus();
          box.select();
        } else setOpen(true);
      } else if (e.key === "?") {
        e.preventDefault();
        setHelp(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  const q = term.trim();
  const { data, isFetching } = useQuery({
    queryKey: ["admin-cmd-users", q],
    queryFn: () =>
      adminFetch<{ users: Hit[] }>(`/api/admin/users?q=${encodeURIComponent(q)}&size=25`),
    enabled: open && q.length >= 2,
    staleTime: 30_000,
  });
  const needle = text.trim().toLowerCase();
  const pages = PAGES.filter((p) => !needle || p.label.toLowerCase().includes(needle));
  const users = q.length >= 2 ? (data?.users ?? []).slice(0, 8) : [];
  const items = [
    ...pages.map((p) => ({ id: p.href, href: p.href, label: p.label, sub: p.keys, Icon: p.Icon })),
    ...users.map((u) => ({
      id: u.id,
      href: `/admin/users/${u.id}`,
      label: u.name || "No name yet",
      sub: u.email,
      Icon: User,
    })),
  ];
  if (q.length >= 2)
    items.push({
      id: "all",
      href: `/admin/users?q=${encodeURIComponent(q)}`,
      label: `All accounts matching "${q}"`,
      sub: "",
      Icon: MagnifyingGlass,
    });
  const cur = Math.min(active, Math.max(0, items.length - 1));

  function close() {
    setOpen(false);
    setText("");
    setTerm("");
    setActive(0);
  }
  function go(href: string) {
    close();
    router.push(href);
  }

  return (
    <>
      {trigger?.(() => setOpen(true))}
      <Dialog.Root open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
        <Dialog.Portal>
          <Dialog.Overlay
            className="an-fade fixed inset-0 z-[60]"
            style={{ background: "var(--scrim)" }}
          />
          <Dialog.Content className={panel} aria-describedby={undefined}>
            <Dialog.Title className="sr-only">Command palette</Dialog.Title>
            <div className="border-line flex items-center gap-2 border-b px-4">
              <MagnifyingGlass size={18} className="text-muted flex-none" aria-hidden />
              <input
                autoFocus
                role="combobox"
                aria-label="Go to a page or find a person"
                aria-expanded
                aria-controls={listId}
                aria-activedescendant={items[cur] ? `cmd-${items[cur].id}` : undefined}
                aria-autocomplete="list"
                placeholder="Go to a page, or search people by email or name"
                value={text}
                onChange={(e) => {
                  const v = e.target.value;
                  setText(v);
                  setActive(0);
                  if (debounce.current) clearTimeout(debounce.current);
                  debounce.current = setTimeout(() => setTerm(v), 200);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActive((cur + 1) % Math.max(1, items.length));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActive((cur - 1 + items.length) % Math.max(1, items.length));
                  } else if (e.key === "Enter" && items[cur]) {
                    e.preventDefault();
                    go(items[cur].href);
                  }
                }}
                className="text-text h-14 min-w-0 flex-1 bg-transparent text-base outline-none focus-visible:shadow-none"
              />
              <kbd className="border-line text-faint mono rounded-md border px-1.5 py-0.5 text-[11px]">
                Esc
              </kbd>
            </div>
            <ul
              id={listId}
              role="listbox"
              aria-label="Results"
              className="m-0 list-none overflow-y-auto p-2"
            >
              {items.map((it, i) => (
                <li
                  key={it.id}
                  id={`cmd-${it.id}`}
                  role="option"
                  aria-selected={i === cur}
                  onMouseMove={() => i !== cur && setActive(i)}
                  onClick={() => go(it.href)}
                  className={cn(
                    "rounded-input flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 text-sm",
                    i === cur ? "bg-s3 text-text" : "text-muted",
                  )}
                >
                  <it.Icon size={18} aria-hidden className={i === cur ? "text-accent" : ""} />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="text-text">{it.label}</span>
                    {it.sub && it.Icon === User && (
                      <span className="text-muted ml-2 truncate">{it.sub}</span>
                    )}
                  </span>
                  {it.sub && it.Icon !== User && (
                    <kbd className="mono text-faint text-[11px]">{it.sub}</kbd>
                  )}
                  {i === cur && <ArrowRight size={14} aria-hidden />}
                </li>
              ))}
              {q.length >= 2 && !isFetching && data && !data.users.length && (
                <li role="presentation" className="text-muted px-3 py-2 text-sm">
                  No people match &quot;{q}&quot;.
                </li>
              )}
              {q.length >= 2 && isFetching && (
                <li role="presentation" className="text-faint px-3 py-2 text-sm">
                  Searching people...
                </li>
              )}
            </ul>
            <div className="border-line text-faint flex flex-wrap gap-x-4 gap-y-1 border-t px-4 py-2 text-xs">
              <span>Up and down to move</span>
              <span>Enter to open</span>
              <span>? for all shortcuts</span>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={help} onOpenChange={setHelp}>
        <Dialog.Portal>
          <Dialog.Overlay
            className="an-fade fixed inset-0 z-[60]"
            style={{ background: "var(--scrim)" }}
          />
          <Dialog.Content className={cn(panel, "max-w-[480px] p-5")} aria-describedby={undefined}>
            <Dialog.Title className="m-0 mb-3 text-lg font-bold">Keyboard shortcuts</Dialog.Title>
            <dl className="divide-line m-0 flex flex-col divide-y">
              {SHORTCUTS.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 py-2 text-sm">
                  <dt className="text-muted">{v}</dt>
                  <dd className="m-0">
                    <kbd className="border-line mono rounded-md border px-2 py-0.5 text-xs">
                      {k}
                    </kbd>
                  </dd>
                </div>
              ))}
            </dl>
            <Dialog.Close className="border-line text-text hover:bg-s2 rounded-input mt-4 h-11 cursor-pointer border bg-transparent px-4 text-sm font-medium">
              Close
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

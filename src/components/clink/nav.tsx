"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Heart,
  ChatCircle,
  GameController,
  Ticket,
  Archive,
  GearSix,
  Moon,
  Leaf,
  Books,
  CookingPot,
  Laptop,
  type Icon,
} from "@phosphor-icons/react";
import { cn } from "@/components/ui/cn";
import { useCouple } from "@/features/couple/context";
import { statusLabel } from "@/features/couple/types";
import { Avatar } from "@/components/ui/avatar";
import { Logo, LogoMark } from "@/components/brand/logo";

export const TABS = [
  { href: "/us", label: "Us", Icon: Heart },
  { href: "/chat", label: "Chat", Icon: ChatCircle },
  { href: "/play", label: "Play", Icon: GameController },
  { href: "/plans", label: "Plans", Icon: Ticket },
  { href: "/keep", label: "Keep", Icon: Archive },
] as const;

const STATUS_ICON: Record<string, Icon> = {
  free: Leaf,
  studying: Books,
  cooking: CookingPot,
  working: Laptop,
  sleeping: Moon,
  away: Moon,
};

function isActive(path: string, href: string) {
  return path === href || path.startsWith(`${href}/`);
}

/** Prototype bottom bar: 5 tabs, pill around the active icon. */
export function TabBar({ unread = 0 }: { unread?: number }) {
  const path = usePathname();
  return (
    <nav
      aria-label="Main"
      className="tabbar border-line bg-app fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t px-2"
      style={{
        height: "calc(64px + max(20px, env(safe-area-inset-bottom)))",
        paddingBottom: "max(20px, env(safe-area-inset-bottom))",
      }}
    >
      {TABS.map(({ href, label, Icon }) => {
        const on = isActive(path, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={on ? "page" : undefined}
            className={cn(
              "press flex flex-col items-center justify-center gap-0.5 text-xs font-medium",
              on ? "text-text hover:text-text" : "text-faint hover:text-muted",
            )}
          >
            <span
              className="relative flex h-[30px] w-14 items-center justify-center rounded-full"
              style={{
                background: on ? "var(--accent)" : "transparent",
                color: on ? "var(--on-accent)" : "var(--text-muted)",
              }}
            >
              <Icon size={22} weight="regular" aria-hidden />
              {href === "/chat" && unread > 0 && !on && (
                <span
                  role="img"
                  className="bg-accent absolute top-0 right-3 h-2 w-2 rounded-full"
                  aria-label={`${unread} unread`}
                />
              )}
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Side rail: compact on tablets in landscape, full with labels from 1024 px. */
export function Rail({ unread = 0 }: { unread?: number }) {
  const path = usePathname();
  const { darkVisible, discreet } = useCouple();
  return (
    <nav
      aria-label="Main"
      className="rail border-line bg-app fixed inset-y-0 left-0 z-20 flex flex-col border-r px-3 py-6"
    >
      <Link
        href="/us"
        className="display rail-word text-text hover:text-text mb-8 px-3 text-[30px]"
      >
        <span className="rail-full">
          <Logo size={28} />
        </span>
        <span className="rail-mini">
          <LogoMark size={34} />
        </span>
      </Link>
      <div className="flex flex-col gap-1">
        {TABS.map(({ href, label, Icon }) => {
          const on = isActive(path, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={on ? "page" : undefined}
              title={label}
              className={cn(
                "press flex h-12 items-center gap-3 rounded-full px-3 text-[15px] font-medium",
                on ? "bg-s1 text-text hover:text-text" : "text-muted hover:bg-s1 hover:text-text",
              )}
            >
              <span
                className="relative flex h-[30px] w-11 flex-none items-center justify-center rounded-full"
                style={{
                  background: on ? "var(--accent)" : "transparent",
                  color: on ? "var(--on-accent)" : "currentColor",
                }}
              >
                <Icon size={22} aria-hidden />
                {href === "/chat" && unread > 0 && !on && (
                  <span className="bg-accent absolute top-0 right-2 h-2 w-2 rounded-full" />
                )}
              </span>
              <span className="rail-full">{label}</span>
            </Link>
          );
        })}
      </div>
      <div className="mt-auto flex flex-col gap-1">
        {darkVisible && !discreet && (
          <Link
            href="/dark"
            title="After Dark"
            className="press text-muted hover:bg-s1 hover:text-text flex h-12 items-center gap-3 rounded-full px-3 text-[15px] font-medium"
          >
            <span className="flex h-[30px] w-11 flex-none items-center justify-center">
              <Moon size={22} aria-hidden />
            </span>
            <span className="rail-full">After Dark</span>
          </Link>
        )}
        <AccountRow on={isActive(path, "/settings")} />
      </div>
    </nav>
  );
}

/**
 * Bottom of the rail: you. Avatar, name and your current status, opening your
 * profile and settings. The compact rail shows just the avatar.
 */
function AccountRow({ on }: { on: boolean }) {
  const { me, myStatus } = useCouple();
  const label = statusLabel(myStatus);
  const status = label ? label[0]!.toUpperCase() + label.slice(1) : "";
  const StatusIcon = STATUS_ICON[myStatus] ?? ChatCircle;
  return (
    <Link
      href="/settings?tab=profile"
      title={`${me.name}: profile and settings`}
      aria-label={`${me.name}, profile and settings`}
      aria-current={on ? "page" : undefined}
      className={cn(
        "press text-text hover:text-text mt-3 flex min-h-14 items-center gap-3 rounded-full border px-2 py-1.5",
        on ? "bg-s1 border-line" : "hover:bg-s1 border-transparent",
      )}
    >
      <span className="flex w-11 flex-none items-center justify-center">
        <Avatar name={me.name} side="me" size={36} photoUrl={me.avatarUrl} icon={me.avatarIcon} />
      </span>
      <span className="rail-full min-w-0 flex-1">
        <span className="block truncate text-[15px] leading-tight font-semibold">{me.name}</span>
        {status && (
          <span className="text-muted mt-0.5 flex items-center gap-1 text-xs leading-tight">
            <StatusIcon size={12} weight="bold" aria-hidden className="flex-none" />
            <span className="truncate">{status}</span>
          </span>
        )}
      </span>
      <GearSix size={18} aria-hidden className="rail-full text-faint mr-2 flex-none" />
    </Link>
  );
}

"use client";
import { useState, type MouseEvent } from "react";
import Link from "@/components/ui/link";
import { IntentLink } from "@/components/ui/intent-link";
import { usePathname } from "next/navigation";
import {
  Heart,
  ChatCircle,
  GameController,
  Ticket,
  GearSix,
  Moon,
  Leaf,
  Books,
  CookingPot,
  Laptop,
  Archive,
  CalendarBlank,
  MagnifyingGlass,
  type Icon,
} from "@phosphor-icons/react";
import { formatClock } from "@/lib/time";
import { useCoupleNow } from "@/features/couple/context";
import { cn } from "@/components/ui/cn";
import { useCouple } from "@/features/couple/context";
import { statusLabel } from "@/features/couple/types";
import { Avatar } from "@/components/ui/avatar";
import { Logo, LogoMark } from "@/components/brand/logo";
import { AfterDarkBadge } from "@/components/clink/after-dark-badge";
import { useBadges, CountBadge, type Badges } from "@/features/couple/badges";

/** Desktop rail extras: places phones reach from inside other screens. */
const MORE = [
  { href: "/keep", label: "Keep", Icon: Archive },
  { href: "/calendar", label: "Calendar", Icon: CalendarBlank },
  { href: "/search", label: "Search", Icon: MagnifyingGlass },
] as const;

export const TABS = [
  { href: "/us", label: "Us", Icon: Heart },
  { href: "/chat", label: "Chat", Icon: ChatCircle },
  { href: "/play", label: "Play", Icon: GameController },
  { href: "/plans", label: "Plans", Icon: Ticket },
  { href: "/settings", label: "Settings", Icon: GearSix },
] as const;

const STATUS_ICON: Record<string, Icon> = {
  free: Leaf,
  studying: Books,
  cooking: CookingPot,
  working: Laptop,
  sleeping: Moon,
  away: Moon,
};

/**
 * The main tabs load ahead so they open instantly. Settings is rarely the
 * next stop, so it loads when you reach for it (see IntentLink).
 */
function TabLink(props: React.ComponentProps<typeof Link> & { href: string }) {
  return props.href === "/settings" ? <IntentLink {...props} /> : <Link prefetch {...props} />;
}

function isActive(path: string, href: string) {
  return path === href || path.startsWith(`${href}/`);
}

/**
 * The tapped tab lights up on the tap itself, not when the next screen has
 * loaded: a pending href wins until the pathname actually changes.
 */
function useActiveTab() {
  const path = usePathname();
  const [pending, setPending] = useState<string | null>(null);
  const [prevPath, setPrevPath] = useState(path);
  if (prevPath !== path) {
    setPrevPath(path);
    setPending(null);
  }
  const active = (href: string) => (pending ? pending === href : isActive(path, href));
  const onTap = (href: string) => (e: MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
      return;
    if (path !== href) setPending(href);
  };
  return { path, active, onTap };
}

/** Prototype bottom bar: 5 tabs, pill around the active icon. */
export function TabBar() {
  const { active, onTap } = useActiveTab();
  const badges = useBadges();
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
        const on = active(href);
        return (
          <TabLink
            key={href}
            href={href}
            onClick={onTap(href)}
            aria-current={on ? "page" : undefined}
            className={cn(
              "press flex min-h-11 flex-col items-center justify-center gap-0.5 text-xs font-medium",
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
              <Icon size={24} weight="regular" aria-hidden />
              {!on && <NavBadge href={href} badges={badges} />}
            </span>
            {label}
          </TabLink>
        );
      })}
    </nav>
  );
}

/** Side rail: compact on tablets in landscape, full with labels from 1024 px. */
export function Rail() {
  const badges = useBadges();
  const { path, active, onTap } = useActiveTab();
  const { darkVisible, discreet, solo } = useCouple();
  return (
    <nav
      aria-label="Main"
      className="rail border-line bg-app no-scrollbar fixed inset-y-0 left-0 z-20 flex flex-col overflow-y-auto border-r px-3 py-6"
    >
      <Link
        href="/us"
        // The Us tab below already loads it ahead; don't fetch it twice.
        prefetch={false}
        className="display rail-word text-text hover:text-text mb-8 px-3 text-[28px]"
      >
        <span className="rail-full">
          <Logo size={28} />
        </span>
        <span className="rail-mini">
          <LogoMark size={34} />
        </span>
      </Link>
      {!solo && <PartnerRow />}
      <div className="flex flex-col gap-1">
        {TABS.map(({ href, label, Icon }) => {
          const on = active(href);
          return (
            <TabLink
              key={href}
              href={href}
              onClick={onTap(href)}
              aria-current={on ? "page" : undefined}
              title={label}
              className={cn(
                "press flex h-12 items-center gap-3 rounded-full px-3 text-[15px] font-medium 2xl:h-14 2xl:text-base",
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
                <Icon size={24} aria-hidden />
                {!on && <NavBadge href={href} badges={badges} />}
              </span>
              <span className="rail-full">{label}</span>
            </TabLink>
          );
        })}
      </div>
      {!solo && (
        <div className="mt-6 flex flex-col gap-1">
          <span className="rail-full text-faint px-4 pb-1 text-xs font-semibold tracking-wide uppercase">
            More
          </span>
          {MORE.map(({ href, label, Icon }) => {
            const on = active(href);
            return (
              <IntentLink
                key={href}
                href={href}
                onClick={onTap(href)}
                aria-current={on ? "page" : undefined}
                title={label}
                className={cn(
                  "press flex h-11 items-center gap-3 rounded-full px-3 text-[15px] font-medium 2xl:h-12",
                  on ? "bg-s1 text-text hover:text-text" : "text-muted hover:bg-s1 hover:text-text",
                )}
              >
                <span className="flex h-[30px] w-11 flex-none items-center justify-center">
                  <Icon size={22} aria-hidden weight={on ? "fill" : "regular"} />
                </span>
                <span className="rail-full">{label}</span>
              </IntentLink>
            );
          })}
        </div>
      )}
      <div className="mt-auto flex flex-col gap-1">
        {darkVisible && !discreet && (
          <IntentLink
            href="/dark"
            title="After Dark"
            className="press text-muted hover:bg-s1 hover:text-text flex h-12 items-center gap-3 rounded-full px-3 text-[15px] font-medium"
          >
            <span className="flex h-[30px] w-11 flex-none items-center justify-center">
              <AfterDarkBadge size={30} />
            </span>
            <span className="rail-full">After Dark</span>
          </IntentLink>
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
    <IntentLink
      href="/settings?tab=profile"
      title={`${me.name}: profile and settings`}
      aria-current={on ? "page" : undefined}
      className={cn(
        "press text-text hover:text-text mt-3 flex min-h-14 items-center gap-3 rounded-full border px-2 py-1.5",
        on ? "bg-s1 border-line" : "hover:bg-s1 border-transparent",
      )}
    >
      <span className="flex w-11 flex-none items-center justify-center">
        <Avatar
          name={me.name}
          side="me"
          size={36}
          sizes={{ xl: 44 }}
          photoUrl={me.avatarUrl}
          icon={me.avatarIcon}
        />
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
      <span className="sr-only">Profile and settings</span>
      <GearSix size={18} aria-hidden className="rail-full text-faint mr-2 flex-none" />
    </IntentLink>
  );
}

/**
 * Top of the desktop rail: your partner, always in view. Online dot, what
 * they're up to and their local time; one click opens your chat.
 */
function PartnerRow() {
  const { partner, presence } = useCouple();
  const now = useCoupleNow(30_000);
  const online = presence.online;
  const status = online ? statusLabel(presence.status) : "away";
  return (
    <IntentLink
      href="/chat"
      title={`Chat with ${partner.name}`}
      className="press bg-s1 border-line text-text hover:text-text hover:bg-s2 rounded-card mb-6 flex items-center gap-3 border p-2.5"
    >
      <span className="relative flex w-11 flex-none items-center justify-center">
        <Avatar
          name={partner.name}
          side="partner"
          size={40}
          sizes={{ xl: 52 }}
          photoUrl={partner.avatarUrl}
          icon={partner.avatarIcon}
          dim={!online}
        />
        {online && (
          <span
            aria-hidden
            className="bg-online absolute right-0 bottom-0 h-3 w-3 rounded-full shadow-[0_0_0_2px_var(--surface-1)]"
          />
        )}
      </span>
      <span className="rail-full min-w-0 flex-1">
        <span className="block truncate text-[15px] leading-tight font-semibold">
          {partner.name}
        </span>
        <span className="text-muted mt-0.5 block truncate text-xs">
          {status ? status[0]!.toUpperCase() + status.slice(1) : ""}
          {" · "}
          <span className="mono">{formatClock(now, partner.timezone)}</span>
        </span>
      </span>
      <span className="sr-only">
        {online ? "Online" : "Away"}. Open your chat with {partner.name}.
      </span>
    </IntentLink>
  );
}

/** The count on a nav icon: unread messages on Chat, your turns and invites on Play. */
function NavBadge({ href, badges }: { href: string; badges: Badges }) {
  if (href === "/chat") return <CountBadge n={badges.chat} label="unread" />;
  if (href === "/play") return <CountBadge n={badges.play} label="waiting on you" />;
  return null;
}

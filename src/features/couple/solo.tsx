"use client";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "@/components/ui/link";
import { useRouter } from "next/navigation";
import {
  ChatCircle,
  GameController,
  Ticket,
  Archive,
  LinkSimple,
  Hourglass,
  Wine,
  CalendarBlank,
  type Icon,
} from "@phosphor-icons/react";
import { useCouple } from "@/features/couple/context";
import { Avatar } from "@/components/ui/avatar";
import { LogoMark, Wordmark } from "@/components/brand/logo";
import { Display, Lead } from "@/components/ui/heading";

/** Routes that work before you link. Everything else shows the link prompt. */
export const SOLO_OPEN = [
  /^\/us$/,
  /^\/settings/,
  /^\/help/,
  // Practice against Clink needs no partner.
  /^\/play\/(oware|fourup|draughts)\/practice$/,
];

const FEATURES: Array<{ match: RegExp; title: string; body: string; Icon: Icon }> = [
  {
    match: /^\/chat/,
    title: "Chat",
    body: "Messages, voice notes, photos and calls, just for the two of you.",
    Icon: ChatCircle,
  },
  {
    match: /^\/play/,
    title: "Play",
    body: "Trivia duels, dares, drawing and photo games you play together.",
    Icon: GameController,
  },
  {
    match: /^\/plans/,
    title: "Plans",
    body: "Date nights, a shared bucket list and watching or listening together.",
    Icon: Ticket,
  },
  {
    match: /^\/keep/,
    title: "Keep",
    body: "Letters and time capsules that open when the moment comes.",
    Icon: Archive,
  },
  {
    match: /^\/calendar/,
    title: "Calendar",
    body: "Your dates, visits and countdowns in one place.",
    Icon: CalendarBlank,
  },
];

/** Moves you into the full app the moment your partner links with you. */
function useLinkWatch() {
  const router = useRouter();
  useEffect(() => {
    let stop = false;
    const check = async () => {
      try {
        const r = await fetch("/api/me/state", { cache: "no-store" });
        const d = await r.json();
        if (!stop && d.linked) router.refresh();
      } catch {
        /* offline: try again next tick */
      }
    };
    const t = setInterval(check, 6000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [router]);
}

type Invite = { code: string; created_at: string; expires_at: string; used_at: string | null };

/**
 * Where your link code stands: none yet, shared and waiting (with how long it
 * still works), or run out (codes last 48 hours, so an old one won't work).
 */
type InviteStatus =
  { state: "none" } | { state: "expired" } | { state: "waiting"; hoursLeft: number };

/** Worked out when fetched (and again each minute), never during render. */
function statusOf(i: Invite | null, now: number): InviteStatus {
  if (!i || i.used_at) return { state: "none" };
  const left = Date.parse(i.expires_at) - now;
  if (left <= 0) return { state: "expired" };
  // Only a code made a while ago counts as waiting: one made just now is still being shared.
  if (now - Date.parse(i.created_at) < 3600_000) return { state: "none" };
  return { state: "waiting", hoursLeft: Math.max(1, Math.round(left / 3600_000)) };
}

function useInviteStatus(): InviteStatus {
  const { data } = useQuery({
    queryKey: ["my-invite"],
    queryFn: async () => {
      const r = await fetch("/api/invites", { cache: "no-store" });
      if (!r.ok) return { state: "none" } as InviteStatus;
      return statusOf(((await r.json()) as { invite: Invite | null }).invite, Date.now());
    },
    refetchInterval: 60_000,
  });
  return data ?? { state: "none" };
}

function LinkCard() {
  const status = useInviteStatus();
  const head =
    status.state === "waiting"
      ? {
          title: "Waiting for your partner",
          body: `Your code works for ${status.hoursLeft} more ${status.hoursLeft === 1 ? "hour" : "hours"}. A nudge might help.`,
          cta: "Send it again",
          Icon: Hourglass,
        }
      : status.state === "expired"
        ? {
            title: "Your code ran out",
            body: "Codes last 48 hours, so the one you sent won't work now. Get a fresh one and send it again.",
            cta: "Get a fresh code",
            Icon: Hourglass,
          }
        : {
            title: "Link with your partner",
            body: "Send them your code, or enter theirs. It takes a minute.",
            cta: "Share my code",
            Icon: LinkSimple,
          };
  return (
    <div
      className="rounded-card border-line bg-s1 flex flex-col gap-4 border p-5"
      data-invite={status.state}
    >
      <div className="flex items-center gap-3">
        <span className="bg-accent/15 text-accent flex h-12 w-12 flex-none items-center justify-center rounded-full">
          <head.Icon size={24} weight="bold" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="m-0 text-lg font-bold">{head.title}</h2>
          <p className="text-muted m-0 text-sm">{head.body}</p>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Link
          href="/link"
          className="press bg-accent text-on-accent hover:text-on-accent flex h-12 items-center justify-center rounded-full px-5 text-base font-semibold sm:flex-1"
        >
          {head.cta}
        </Link>
        <Link
          href="/link?enter=1"
          className="press border-line bg-s2 text-text hover:text-text flex h-12 items-center justify-center rounded-full border px-5 text-base font-semibold sm:flex-1"
        >
          I have their code
        </Link>
      </div>
    </div>
  );
}

/** Us, before you link: you, the invite, and what opens up once you do. */
export function SoloHome() {
  const { me } = useCouple();
  useLinkWatch();
  return (
    <div className="screen an-screen">
      <div className="app-topbar flex h-11 flex-none items-center lg:hidden">
        <h1 className="m-0 flex items-center gap-1.5">
          <LogoMark size={30} decorative />
          <Wordmark size={28} />
        </h1>
      </div>
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-5 pt-4">
        <div className="flex items-center gap-4">
          <Avatar name={me.name} side="me" size={64} photoUrl={me.avatarUrl} icon={me.avatarIcon} />
          <div className="min-w-0">
            <Display size={36}>Hi, {me.name}</Display>
            <Lead className="mt-1">Clink is for two. Bring your person in.</Lead>
          </div>
        </div>
        <LinkCard />
        <section aria-labelledby="solo-what" className="flex flex-col gap-2">
          <h2 id="solo-what" className="m-0 text-lg font-bold">
            What opens up when you link
          </h2>
          <ul className="rounded-card border-line bg-s1 m-0 list-none overflow-hidden border p-0">
            {[
              {
                title: "Clinks",
                body: "A tap that lands on their device, wherever they are.",
                Icon: Wine,
              },
              ...FEATURES.slice(0, 4),
            ].map(({ title, body, Icon }, i, all) => (
              <li
                key={title}
                className={`flex items-start gap-3 px-4 py-3.5 ${i < all.length - 1 ? "border-line border-b" : ""}`}
              >
                <Icon size={22} className="text-accent mt-0.5 flex-none" aria-hidden />
                <span>
                  <span className="block text-base font-semibold">{title}</span>
                  <span className="text-muted block text-sm">{body}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
        <p className="text-muted m-0 text-sm">
          While you wait, set up your profile and the look of the app in{" "}
          <Link href="/settings" className="text-link text-text hover:text-text">
            Settings
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

/** A partner-only screen, before you link. */
export function SoloGate({ path }: { path: string }) {
  useLinkWatch();
  const f = FEATURES.find((x) => x.match.test(path)) ?? {
    title: "This part of Clink",
    body: "It's built for two, so it opens once you link.",
    Icon: LinkSimple,
  };
  return (
    <div className="screen screen-fill an-screen">
      <div className="fill-center mx-auto flex w-full max-w-[520px] flex-col items-center gap-4 text-center">
        <span className="bg-s1 border-line text-accent flex h-16 w-16 items-center justify-center rounded-full border">
          <f.Icon size={30} aria-hidden />
        </span>
        <Display size={36}>{f.title} opens once you link</Display>
        <Lead>{f.body}</Lead>
        <div className="w-full text-left">
          <LinkCard />
        </div>
      </div>
    </div>
  );
}

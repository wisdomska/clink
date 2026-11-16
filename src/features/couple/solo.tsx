"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChatCircle,
  GameController,
  Ticket,
  Archive,
  GearSix,
  LinkSimple,
  Wine,
  CalendarBlank,
  type Icon,
} from "@phosphor-icons/react";
import { useCouple } from "@/features/couple/context";
import { Avatar } from "@/components/ui/avatar";
import { LogoMark, Wordmark } from "@/components/brand/logo";
import { Display, Lead } from "@/components/ui/heading";

/** Routes that work before you link. Everything else shows the link prompt. */
export const SOLO_OPEN = [/^\/us$/, /^\/settings/, /^\/help/];

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

function LinkCard() {
  return (
    <div className="rounded-card border-line bg-s1 flex flex-col gap-4 border p-5">
      <div className="flex items-center gap-3">
        <span className="bg-accent/15 text-accent flex h-12 w-12 flex-none items-center justify-center rounded-full">
          <LinkSimple size={24} weight="bold" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="m-0 text-lg font-bold">Link with your partner</h2>
          <p className="text-muted m-0 text-sm">
            Send them your code, or enter theirs. It takes a minute.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Link
          href="/link"
          className="press bg-accent text-on-accent hover:text-on-accent flex h-12 items-center justify-center rounded-full px-5 text-base font-semibold sm:flex-1"
        >
          Share my code
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
      <div className="app-topbar flex h-11 flex-none items-center justify-between lg:hidden">
        <h1 className="m-0 flex items-center gap-1.5">
          <LogoMark size={30} decorative />
          <Wordmark size={28} />
        </h1>
        <Link
          href="/settings"
          aria-label="Settings"
          className="press border-line bg-s1 text-text hover:text-text flex h-11 w-11 items-center justify-center rounded-full border"
        >
          <GearSix size={24} aria-hidden />
        </Link>
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

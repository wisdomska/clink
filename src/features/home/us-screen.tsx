"use client";
import { OnThisDay } from "./on-this-day";
import { MissedCallCard } from "@/features/call/missed-call-card";
import { useEffect, useRef, useState } from "react";
import { Tips } from "@/components/clink/tips";
import Link from "@/components/ui/link";
import { IntentLink } from "@/components/ui/intent-link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Archive, ChatCircle, Phone, VideoCamera } from "@phosphor-icons/react";
import { useCall } from "@/features/call/call-provider";
import { useCouple, useCoupleNow } from "@/features/couple/context";
import { supabaseBrowser } from "@/lib/supabase/client";
import { PresencePair } from "./presence-pair";
import { DualClock } from "./dual-clock";
import { ClinkButton } from "./clink-button";
import { MoodCard } from "./mood-card";
import { CountdownCard } from "./countdown-card";
import { RitualCard } from "./ritual-card";
import { MilestoneMoment } from "./milestone-moment";
import { AsleepCard } from "./asleep-card";
import { useSendClink } from "./use-send-clink";
import { LogoMark, Wordmark } from "@/components/brand/logo";
import { AfterDarkBadge } from "@/components/clink/after-dark-badge";

export function UsScreen() {
  const { darkVisible, discreet, coupleId, linkedAt } = useCouple();
  const router = useRouter();
  const params = useSearchParams();
  const now = useCoupleNow();
  const { sendClink } = useSendClink();
  const linkedDays = linkedAt
    ? Math.max(0, Math.floor((now.getTime() - Date.parse(linkedAt)) / 86_400_000))
    : null;
  const wordTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstSent = useRef(false);

  const { data: streak } = useQuery({
    queryKey: ["streak", coupleId],
    queryFn: async () => (await supabaseBrowser().rpc("clink_streak")).data ?? 0,
  });

  // Flow 10.1 step 7: "Send your first Clink" lands here and sends it.
  useEffect(() => {
    if (params.get("first") === "1" && !firstSent.current) {
      firstSent.current = true;
      setTimeout(() => void sendClink("tap"), 400);
      router.replace("/us");
    }
  }, [params, router, sendClink]);

  // Discreet mode: long-press the wordmark for 2 s to open After Dark.
  const wordDown = () => {
    if (wordTimer.current) clearTimeout(wordTimer.current);
    wordTimer.current = setTimeout(() => discreet && darkVisible && router.push("/dark"), 2000);
  };
  const wordUp = () => wordTimer.current && clearTimeout(wordTimer.current);

  return (
    <div className="screen an-screen">
      <div className="app-topbar flex h-11 flex-none items-center justify-between lg:hidden">
        <h1
          onPointerDown={wordDown}
          onPointerUp={wordUp}
          onPointerLeave={wordUp}
          className="m-0 flex items-center gap-1.5 select-none"
        >
          <LogoMark size={30} decorative />
          <Wordmark size={28} />
        </h1>
        <div className="flex gap-2">
          {darkVisible && !discreet && (
            <IntentLink
              href="/dark"
              aria-label="After Dark, 18+"
              title="After Dark"
              className="press flex h-11 w-11 items-center justify-center rounded-full"
            >
              <AfterDarkBadge />
            </IntentLink>
          )}
          <IntentLink
            href="/keep"
            aria-label="Keep"
            className="press border-line bg-s1 text-text hover:text-text flex h-11 w-11 items-center justify-center rounded-full border"
          >
            <Archive size={24} aria-hidden />
          </IntentLink>
        </div>
      </div>
      {/* Desktop header: the day, how long you've been linked, and quick ways to reach them. */}
      <div className="hidden items-end justify-between gap-6 lg:flex">
        <div className="min-w-0">
          <h1
            onPointerDown={wordDown}
            onPointerUp={wordUp}
            onPointerLeave={wordUp}
            className="display m-0 text-[48px] leading-[1.05] select-none 2xl:text-[64px]"
          >
            Us
          </h1>
          <p className="text-muted m-0 mt-1 text-base">
            {now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
            {linkedDays !== null && ` · day ${linkedDays + 1} together on Clink`}
          </p>
        </div>
        <DesktopActions />
      </div>
      {/*
        Phones: one column in the prototype order.
        Laptop: the two of you on the left, your day on the right.
        Large desktop: you two, how you feel, and what's coming, side by side.
      */}
      <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 lg:mt-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-6 2xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] 2xl:gap-8">
        <div className="flex min-w-0 flex-col gap-4 lg:gap-6">
          <MissedCallCard />
          <PresencePair now={now} />
          <DualClock now={now} />
          <AsleepCard now={now} />
          <ClinkButton streak={streak ?? null} />
          <Tips
            tips={[
              {
                id: "hold-together",
                text: "Press and hold the Clink button to hold together. You'll feel each other live.",
              },
              {
                id: "partner-press",
                text: "Press and hold your partner's picture for quick actions: call, message, clink.",
              },
              {
                id: "discreet-entry",
                text: "Discreet mode is on: press and hold the Clink wordmark for 2 seconds to open After Dark.",
                when: discreet && darkVisible,
              },
            ]}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-4 lg:gap-6 2xl:grid 2xl:grid-cols-2 2xl:items-start">
          <div className="flex min-w-0 flex-col gap-4 lg:gap-6">
            <MoodCard />
            <OnThisDay />
          </div>
          <div className="flex min-w-0 flex-col gap-4 lg:gap-6">
            <CountdownCard now={now} />
            <RitualCard />
            <MilestoneMoment />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Desktop only: reach them in one click from the top of Us. */
function DesktopActions() {
  const { partner } = useCouple();
  const { start } = useCall();
  const item =
    "press border-line bg-s1 text-text hover:text-text hover:bg-s2 flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold";
  return (
    <div className="flex flex-none items-center gap-2">
      <Link href="/chat" className={item}>
        <ChatCircle size={18} aria-hidden /> Message {partner.name}
      </Link>
      <button
        type="button"
        onClick={() => start(false)}
        className={item}
        aria-label={`Call ${partner.name}`}
      >
        <Phone size={18} aria-hidden /> Call
      </button>
      <button
        type="button"
        onClick={() => start(true)}
        className={item}
        aria-label={`Video call ${partner.name}`}
      >
        <VideoCamera size={18} aria-hidden /> Video
      </button>
      <IntentLink href="/keep" className={item}>
        <Archive size={18} aria-hidden /> Keep
      </IntentLink>
    </div>
  );
}

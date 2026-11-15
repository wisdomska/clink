"use client";
import { MissedCallCard } from "@/features/call/missed-call-card";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Moon, GearSix } from "@phosphor-icons/react";
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

export function UsScreen() {
  const { darkVisible, discreet, coupleId } = useCouple();
  const router = useRouter();
  const params = useSearchParams();
  const now = useCoupleNow();
  const { sendClink } = useSendClink();
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
      <div className="flex h-11 flex-none items-center justify-between lg:hidden">
        <h1
          onPointerDown={wordDown}
          onPointerUp={wordUp}
          onPointerLeave={wordUp}
          className="display m-0 text-[30px] select-none"
        >
          clink
        </h1>
        <div className="flex gap-2">
          {darkVisible && !discreet && (
            <Link
              href="/dark"
              aria-label="After Dark"
              className="press border-line bg-s1 text-text hover:text-text flex h-11 w-11 items-center justify-center rounded-full border"
            >
              <Moon size={20} />
            </Link>
          )}
          <Link
            href="/settings"
            aria-label="Settings"
            className="press border-line bg-s1 text-text hover:text-text flex h-11 w-11 items-center justify-center rounded-full border"
          >
            <GearSix size={20} />
          </Link>
        </div>
      </div>
      <h1
        onPointerDown={wordDown}
        onPointerUp={wordUp}
        onPointerLeave={wordUp}
        className="display m-0 hidden text-[48px] leading-[1.05] select-none lg:block"
      >
        Us
      </h1>
      {/* Phones: one column in the prototype order. Desktop: the Clink side and the day side. */}
      <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8">
        <div className="flex min-w-0 flex-col gap-4">
          <MissedCallCard />
          <PresencePair now={now} />
          <DualClock now={now} />
          <AsleepCard now={now} />
          <ClinkButton streak={streak ?? null} />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <MoodCard />
          <CountdownCard now={now} />
          <RitualCard />
          <MilestoneMoment />
        </div>
      </div>
    </div>
  );
}

"use client";
import Link from "next/link";
import { MoonStars, Microphone, EnvelopeSimple } from "@phosphor-icons/react";
import { useCouple } from "@/features/couple/context";
import { localParts } from "@/lib/time";

/** Partner asleep: "It's 2:14 am for Theo. Leave something for the morning?" */
export function AsleepCard({ now }: { now: Date }) {
  const { partner, presence } = useCouple();
  const { hour, minute } = localParts(now, partner.timezone);
  const late = hour < 6 || hour >= 23;
  if (presence.status !== "sleeping" && !(late && !presence.online)) return null;
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const time = `${h12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "am" : "pm"}`;
  const pill = "press flex h-11 items-center gap-1.5 rounded-full border border-line bg-s2 px-4 text-sm font-medium text-text hover:text-text";
  return (
    <div className="an-reveal flex flex-none flex-col gap-3 rounded-card border border-line bg-s1 p-4">
      <div className="flex items-start gap-2.5">
        <MoonStars size={24} className="flex-none text-accent" aria-hidden />
        <p className="m-0 text-base leading-[1.45] font-medium">
          It&apos;s {time} for {partner.name}. Leave something for the morning?
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/chat?voice=1" className={pill}>
          <Microphone size={18} aria-hidden />
          Voice note
        </Link>
        <Link href="/keep?write=letter" className={pill}>
          <EnvelopeSimple size={18} aria-hidden />
          Open When letter
        </Link>
      </div>
    </div>
  );
}

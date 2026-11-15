"use client";
import {
  Wine,
  PhoneCall,
  GameController,
  EnvelopeSimpleOpen,
  Moon,
  Heart,
} from "@phosphor-icons/react";
import { BrandPoster, type Moment } from "@/components/brand/poster";

const MOMENTS: Moment[] = [
  {
    icon: <Wine size={22} weight="fill" />,
    tone: "#FF4F7B",
    title: "Theo sent you a clink",
    meta: "Lagos to London · just now",
  },
  {
    icon: <PhoneCall size={22} weight="fill" />,
    tone: "#B9A4FF",
    title: "Nia is calling",
    meta: "Video call · tap to answer",
  },
  {
    icon: <GameController size={22} weight="fill" />,
    tone: "#FFD08A",
    title: "Your move in Trivia duel",
    meta: "Theo leads 3 to 2",
  },
  {
    icon: <EnvelopeSimpleOpen size={22} weight="fill" />,
    tone: "#FFB3C4",
    title: "A letter unlocks Friday",
    meta: "Open when you miss me",
  },
  {
    icon: <Moon size={22} weight="fill" />,
    tone: "#FF5A3C",
    title: "After Dark: new dare",
    meta: "Only you two can see it",
  },
  {
    icon: <Heart size={22} weight="fill" />,
    tone: "#FF8A7A",
    title: "12 days until you land",
    meta: "Counting down together",
  },
];

/** The sign-in poster: big on desktop, a compact band on phones. */
export function AuthPoster({ compact = false }: { compact?: boolean }) {
  return (
    <BrandPoster
      compact={compact}
      moments={MOMENTS}
      headline={
        compact ? (
          <>Closer, from apart.</>
        ) : (
          <>
            Do things together,
            <br />
            from apart.
          </>
        )
      }
      sub="Clinks, calls, games, letters and a little After Dark. One private space, built for two."
      chips={["18+ only", "Private by design", "Free to use"]}
    />
  );
}

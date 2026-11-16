import Image from "next/image";
import {
  Fingerprint,
  PhoneDisconnect,
  Microphone,
  VideoCamera,
} from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/components/ui/cn";

function Cell({
  className,
  title,
  body,
  children,
  tone = "s1",
  d = 0,
}: {
  className?: string;
  title: string;
  body: string;
  children?: React.ReactNode;
  tone?: "s1" | "s2" | "accent" | "ember";
  d?: number;
}) {
  return (
    <li
      data-reveal
      style={{ ["--d" as string]: d }}
      className={cn(
        "rounded-card relative flex flex-col justify-between gap-6 overflow-hidden p-6 md:p-7",
        tone === "s1" && "bg-s1 border-line border",
        tone === "s2" && "bg-s2 border-line border",
        tone === "accent" && "bg-accent text-on-accent",
        tone === "ember" &&
          "border border-[color-mix(in_oklab,var(--ember)_45%,var(--line))] bg-[color-mix(in_oklab,var(--ember)_9%,var(--surface-1))]",
        className,
      )}
    >
      {children}
      <div>
        <h3
          className={cn(
            "display m-0 text-[26px] leading-[1.05] tracking-[-0.02em] md:text-[30px]",
            tone === "accent" ? "text-on-accent" : "text-text",
          )}
        >
          {title}
        </h3>
        <p
          className={cn(
            "mt-2 mb-0 max-w-[40ch] text-base leading-relaxed",
            tone === "accent" ? "text-on-accent" : "text-muted",
          )}
        >
          {body}
        </p>
      </div>
    </li>
  );
}

function Flap({ ch }: { ch: string }) {
  return (
    <span className="mono rounded-flap flex h-[60px] w-[44px] items-center justify-center bg-[var(--on-accent)] text-[34px] text-[var(--blush)] md:h-[72px] md:w-[52px] md:text-[42px]">
      {ch}
    </span>
  );
}

/** Six things, six cells: one large, two wide, three small. No empty tiles. */
export function FeatureBento() {
  return (
    <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-2 lg:grid-cols-4 lg:gap-4">
      {/* Calls: the big one */}
      <Cell
        className="md:col-span-2 lg:row-span-2 lg:min-h-[520px]"
        title="Calls that feel like the same room."
        body="Voice and video, one tap from your chat. Missed one? It waits for you, with a way to call straight back."
      >
        <div aria-hidden className="relative flex flex-1 items-center justify-center pt-4">
          <div className="bg-app border-line relative w-full max-w-[420px] overflow-hidden rounded-[16px] border">
            <div className="grid aspect-[16/10] grid-cols-2">
              <div className="flex items-center justify-center bg-[var(--bg-night)]">
                <Image
                  src="/memoji/p10-wave.webp"
                  alt=""
                  width={96}
                  height={96}
                  className="h-20 w-20 md:h-24 md:w-24"
                />
              </div>
              <div className="bg-s2 flex items-center justify-center">
                <Image
                  src="/memoji/p12-wave.webp"
                  alt=""
                  width={96}
                  height={96}
                  className="h-20 w-20 md:h-24 md:w-24"
                />
              </div>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="mono text-text text-sm">1:12:04</span>
              <span className="flex gap-2">
                <span className="bg-s2 text-text flex h-10 w-10 items-center justify-center rounded-full">
                  <Microphone size={18} />
                </span>
                <span className="bg-s2 text-text flex h-10 w-10 items-center justify-center rounded-full">
                  <VideoCamera size={18} />
                </span>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--danger)] text-[var(--on-accent)]">
                  <PhoneDisconnect size={18} weight="fill" />
                </span>
              </span>
            </div>
          </div>
        </div>
      </Cell>

      {/* Countdown: solid Rouge */}
      <Cell
        tone="accent"
        d={1}
        className="md:col-span-2"
        title="A countdown to your next kiss."
        body="Add the next visit and watch it tick down on a departure board."
      >
        <div aria-hidden className="flex items-end gap-1.5">
          <Flap ch="1" />
          <Flap ch="2" />
          <span className="mx-1.5 pb-2 text-sm font-bold">days</span>
          <Flap ch="0" />
          <Flap ch="7" />
          <span className="ml-1.5 pb-2 text-sm font-bold">hrs</span>
        </div>
      </Cell>

      {/* Mood */}
      <Cell
        tone="s2"
        d={2}
        title="Say how you feel."
        body="Missing you, cosy, flirty. One tap and they know."
      >
        <div aria-hidden className="flex -space-x-3">
          {["mood-missing", "mood-cosy", "mood-flirty"].map((m) => (
            <Image
              key={m}
              src={`/art/${m}.webp`}
              alt=""
              width={64}
              height={64}
              className="h-16 w-16"
            />
          ))}
        </div>
      </Cell>

      {/* Watch and listen */}
      <Cell
        d={3}
        title="Press play together."
        body="Watch in sync and build a shared queue of songs."
      >
        <div aria-hidden className="flex gap-2">
          <Image src="/landing/popcorn.webp" alt="" width={64} height={64} className="h-16 w-16" />
          <Image
            src="/landing/headphone.webp"
            alt=""
            width={64}
            height={64}
            className="h-16 w-16"
          />
        </div>
      </Cell>

      {/* After Dark: ember, wide */}
      <Cell
        tone="ember"
        d={1}
        className="md:col-span-2 lg:col-span-3"
        title="After Dark, for the two of you."
        body="A private space for the spicier stuff: dares, decks, the wheel and a vault. It has its own PIN and opens only when you both say yes."
      >
        <div aria-hidden className="flex items-center gap-3">
          <Image
            src="/landing/lock.webp"
            alt=""
            width={72}
            height={72}
            className="h-[72px] w-[72px]"
          />
          <Image src="/art/fire.webp" alt="" width={72} height={72} className="h-[72px] w-[72px]" />
        </div>
      </Cell>

      {/* Hold together */}
      <Cell
        tone="s2"
        d={2}
        className="md:col-span-2 lg:col-span-1"
        title="Hold together."
        body="Both press and hold. Your screens light up and count the seconds."
      >
        <div aria-hidden className="text-accent flex items-center">
          <Fingerprint size={56} weight="light" />
          <Fingerprint size={56} weight="light" className="-ml-2 -scale-x-100" />
        </div>
      </Cell>
    </ul>
  );
}

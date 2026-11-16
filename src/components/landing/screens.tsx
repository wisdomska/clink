import Image from "next/image";
import {
  CaretLeft,
  Heart,
  LockSimple,
  Microphone,
  Phone,
  Play,
  Plus,
  VideoCamera,
} from "@phosphor-icons/react/dist/ssr";

/*
 * Live miniatures of real Clink screens for the product tour. They use the
 * app's own tokens, bubble shapes and art, at device scale. Not interactive:
 * the Device frame hides them from assistive tech and nothing is focusable.
 */

const THEO = "/memoji/p12-love.webp";
const AMA = "/memoji/p10-love.webp";

function TopBar({ title, sub, art }: { title: string; sub?: React.ReactNode; art?: string }) {
  return (
    <div className="border-line flex h-14 flex-none items-center gap-2.5 border-b px-3">
      <CaretLeft size={18} className="text-muted" />
      {art && (
        <Image
          src={art}
          alt=""
          width={32}
          height={32}
          className="bg-s2 h-8 w-8 rounded-full object-contain"
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="text-text truncate text-[15px] leading-tight font-bold">{title}</div>
        {sub && <div className="text-muted text-xs leading-tight">{sub}</div>}
      </div>
    </div>
  );
}

const WAVE = [
  6, 10, 16, 9, 20, 14, 8, 18, 24, 12, 7, 15, 22, 17, 9, 13, 19, 11, 6, 14, 21, 10, 8, 16,
];

function Waveform({ className }: { className: string }) {
  return (
    <span className={`flex h-6 items-center gap-[2px] ${className}`}>
      {WAVE.map((h, i) => (
        <i key={i} className="block w-[3px] rounded-full bg-current" style={{ height: h }} />
      ))}
    </span>
  );
}

export function ChatScreen() {
  return (
    <>
      <div className="border-line flex h-14 flex-none items-center gap-2.5 border-b px-3">
        <CaretLeft size={18} className="text-muted" />
        <Image
          src={THEO}
          alt=""
          width={32}
          height={32}
          className="bg-s2 h-8 w-8 rounded-full object-contain"
        />
        <div className="min-w-0 flex-1">
          <div className="text-text text-[15px] leading-tight font-bold">Theo</div>
          <div className="text-muted flex items-center gap-1 text-xs leading-tight">
            <span className="bg-accent h-1.5 w-1.5 rounded-full" />
            Online
          </div>
        </div>
        <Phone size={20} className="text-text" />
        <VideoCamera size={20} className="text-text ml-2" />
      </div>
      <div className="flex flex-1 flex-col justify-end gap-2 overflow-hidden px-3 pb-3 text-[14px] leading-snug">
        <div className="bg-s1 border-line text-text max-w-[78%] self-start rounded-[var(--r-bubble-in)] border px-3 py-2">
          Landed. It&apos;s raining, obviously.
        </div>
        <div className="bg-s3 text-text max-w-[78%] self-end rounded-[var(--r-bubble-out)] px-3 py-2">
          Send me the sound of it
        </div>
        <div className="bg-s1 border-line flex items-center gap-2 self-start rounded-[var(--r-bubble-in)] border py-1.5 pr-3 pl-1.5">
          <span className="bg-accent text-on-accent flex h-8 w-8 flex-none items-center justify-center rounded-full">
            <Play size={14} weight="fill" />
          </span>
          <span className="relative">
            <Waveform className="text-line-strong" />
            <Waveform className="lp-wave-played text-accent absolute inset-0" />
          </span>
          <span className="mono text-muted text-xs">0:42</span>
        </div>
        <Image
          src="/stickers/miss-u.webp"
          alt=""
          width={76}
          height={76}
          className="h-[76px] w-[76px] self-end"
        />
        <div className="bg-s1 border-line text-text max-w-[78%] self-start rounded-[var(--r-bubble-in)] border px-3 py-2">
          Call in 10? Making tea first
        </div>
      </div>
      <div className="flex flex-none items-center gap-2 px-3 pb-5">
        <span className="bg-s2 text-muted flex h-10 w-10 items-center justify-center rounded-full">
          <Plus size={18} />
        </span>
        <span className="bg-s2 border-line text-muted flex h-10 flex-1 items-center rounded-full border px-4 text-sm">
          Message
        </span>
        <span className="bg-accent text-on-accent flex h-10 w-10 items-center justify-center rounded-full">
          <Microphone size={18} weight="fill" />
        </span>
      </div>
    </>
  );
}

const OPTIONS = [
  "Kelewele, extra pepper",
  "Cereal, no milk",
  "Leftover jollof",
  "Nothing, he's asleep",
];

export function GameScreen() {
  return (
    <>
      <TopBar title="How well do you know me" sub="Question 4 of 10" art="/art/know_me.webp" />
      <div className="flex flex-1 flex-col gap-4 overflow-hidden px-4 pt-4 pb-5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Image
              src={AMA}
              alt=""
              width={28}
              height={28}
              className="bg-s2 h-7 w-7 rounded-full object-contain"
            />
            <span className="mono text-text text-lg">3</span>
          </span>
          <span className="text-muted text-xs">Live</span>
          <span className="flex items-center gap-2">
            <span className="mono text-text text-lg">2</span>
            <Image
              src={THEO}
              alt=""
              width={28}
              height={28}
              className="bg-s2 h-7 w-7 rounded-full object-contain"
            />
          </span>
        </div>
        <div className="bg-s1 border-line rounded-card border p-4">
          <div className="display text-text text-[22px] leading-[1.1]">
            What does Theo order at 2am?
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {OPTIONS.map((o, i) => (
            <div
              key={o}
              className={
                i === 2
                  ? "border-accent text-text flex h-11 items-center justify-between rounded-full border-[1.5px] bg-[color-mix(in_oklab,var(--accent)_12%,transparent)] px-4 text-sm font-medium"
                  : "bg-s2 border-line text-text flex h-11 items-center rounded-full border px-4 text-sm"
              }
            >
              {o}
              {i === 2 && (
                <Image
                  src={AMA}
                  alt=""
                  width={22}
                  height={22}
                  className="h-[22px] w-[22px] scale-110"
                />
              )}
            </div>
          ))}
        </div>
        <div className="text-muted mt-auto flex items-center justify-center gap-2 text-sm">
          Theo is answering
          <span className="lp-dots flex gap-1">
            <i className="bg-muted block h-1.5 w-1.5 rounded-full" />
            <i className="bg-muted block h-1.5 w-1.5 rounded-full" />
            <i className="bg-muted block h-1.5 w-1.5 rounded-full" />
          </span>
        </div>
      </div>
    </>
  );
}

export function LetterScreen() {
  return (
    <>
      <TopBar title="Time capsule" sub="From Ama" />
      <div className="flex flex-1 flex-col gap-5 overflow-hidden px-4 pt-6 pb-5">
        <div className="bg-s2 border-line relative aspect-[4/3] overflow-hidden rounded-[16px] border">
          <div
            className="bg-s3 absolute inset-x-0 top-0 h-[62%]"
            style={{ clipPath: "polygon(0 0,100% 0,50% 100%)" }}
          />
          <div className="lp-seal bg-accent text-on-accent absolute top-[62%] left-1/2 -mt-7 -ml-7 flex h-14 w-14 items-center justify-center rounded-full">
            <Heart size={24} weight="fill" />
          </div>
          <div className="display text-text absolute inset-x-0 bottom-4 text-center text-lg leading-tight">
            Read this on our anniversary
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <LockSimple size={16} weight="bold" className="text-accent" />
          <span className="text-text font-medium">Sealed until Fri 21 Nov, 20:00</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            ["04", "days"],
            ["22", "hours"],
            ["46", "mins"],
          ].map(([v, l]) => (
            <div key={l} className="bg-s1 border-line rounded-[12px] border py-2.5 text-center">
              <div className="mono text-text text-2xl leading-none">{v}</div>
              <div className="text-muted mt-1 text-xs">{l}</div>
            </div>
          ))}
        </div>
        <div className="bg-s2 border-line text-muted mt-auto flex h-11 items-center justify-center rounded-full border text-sm font-medium">
          Opens on Friday
        </div>
      </div>
    </>
  );
}

const IDEAS = [
  "Museum tour from bed",
  "Write each other a poem",
  "Cook the same recipe",
  "Watch a film in sync",
  "Ramen and a playlist",
  "Draw each other",
  "Breakfast call",
  "Museum tour from bed",
  "Cook the same recipe",
  "Watch a film in sync",
  "Stargaze on a call",
  "Ramen and a playlist",
];

export function PlansScreen() {
  return (
    <>
      <TopBar title="Date roulette" sub="Saturday night" />
      <div className="flex flex-1 flex-col gap-5 overflow-hidden px-4 pt-6 pb-5">
        <div className="relative h-[156px] overflow-hidden" style={{ ["--row" as string]: "52px" }}>
          <div
            className="lp-reel flex flex-col"
            style={{ transform: "translateY(calc(var(--row) * -9))" }}
          >
            {IDEAS.map((idea, i) => (
              <div
                key={i}
                className={
                  i === 10
                    ? "display text-text flex h-[52px] flex-none items-center justify-center text-[22px]"
                    : "text-muted flex h-[52px] flex-none items-center justify-center text-base"
                }
              >
                {idea}
              </div>
            ))}
          </div>
          <div className="lp-reel-window border-accent pointer-events-none absolute inset-x-0 top-[52px] h-[52px] rounded-full border-[1.5px]" />
          <div className="from-app pointer-events-none absolute inset-x-0 top-0 h-10 bg-linear-to-b to-transparent" />
          <div className="from-app pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-linear-to-t to-transparent" />
        </div>
        <div className="bg-s1 border-line rounded-card flex items-center gap-3 border p-3">
          <Image src="/landing/stars.webp" alt="" width={48} height={48} className="h-12 w-12" />
          <div>
            <div className="text-text text-sm font-bold">Stargaze on a call</div>
            <div className="text-muted text-xs">Free, about an hour, blanket required</div>
          </div>
        </div>
        <div className="mt-auto grid grid-cols-2 gap-2">
          <span className="bg-s2 border-line text-text flex h-11 items-center justify-center rounded-full border text-sm font-medium">
            Spin again
          </span>
          <span className="bg-accent text-on-accent flex h-11 items-center justify-center rounded-full text-sm font-bold">
            Book it
          </span>
        </div>
      </div>
    </>
  );
}

import Link from "next/link";
import { EyeSlash, HandHeart, Lock, SignOut } from "@phosphor-icons/react/dist/ssr";

const POINTS = [
  {
    icon: Lock,
    title: "After Dark stays between you.",
    body: "Its own PIN, both of you say yes, and our team can never see what's inside.",
  },
  {
    icon: EyeSlash,
    title: "Your media, your rules.",
    body: "Photos lose their location data. Private media deletes on the schedule the sender picks.",
  },
  {
    icon: HandHeart,
    title: "Never sold, never tracked.",
    body: "No ads and no session replay. Our analytics count taps, never what you say.",
  },
  {
    icon: SignOut,
    title: "Leave whenever you need to.",
    body: "Unlink or block any time. Private media is wiped for both of you within an hour.",
  },
] as const;

/** Adults only, private by design. A large 18+ mark beside four plain promises. */
export function Trust() {
  return (
    <section
      aria-labelledby="trust-title"
      className="mx-auto grid max-w-[1440px] gap-12 px-4 py-24 md:px-8 md:py-32 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20 xl:px-12"
    >
      <div data-reveal>
        <div
          aria-hidden
          className="display text-accent text-[clamp(7rem,20vw,15rem)] leading-[0.8] tracking-[-0.05em]"
        >
          18+
        </div>
        <h2
          id="trust-title"
          className="display mt-8 mb-0 text-[clamp(2.25rem,4.4vw,3.75rem)] leading-[1] tracking-[-0.03em]"
        >
          For adults in love. Private by design.
        </h2>
        <p className="text-muted mt-5 mb-0 max-w-[42ch] text-lg leading-relaxed">
          Clink is for couples aged 18 and over. Read the{" "}
          <Link href="/privacy" className="text-text underline underline-offset-4">
            privacy policy
          </Link>{" "}
          or{" "}
          <Link href="/safety" className="text-text underline underline-offset-4">
            help and safety
          </Link>
          .
        </p>
      </div>
      <ul className="border-line m-0 grid list-none gap-x-10 gap-y-10 self-end border-t p-0 pt-10 sm:grid-cols-2">
        {POINTS.map(({ icon: Icon, title, body }, i) => (
          <li key={title} data-reveal style={{ ["--d" as string]: i }}>
            <Icon size={28} weight="duotone" className="text-accent" aria-hidden />
            <h3 className="text-text mt-4 mb-0 text-xl leading-snug font-bold">{title}</h3>
            <p className="text-muted mt-2 mb-0 text-base leading-relaxed">{body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

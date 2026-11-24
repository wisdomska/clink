import Image from "next/image";

const MOMENTS = [
  { art: "/landing/clinking_glasses.webp", text: "Theo sent a clink" },
  { art: "/art/trivia.webp", text: "Your move in Trivia duel" },
  { art: "/landing/love_letter.webp", text: "A letter unlocks Friday" },
  { art: "/art/telephone.webp", text: "Ama is calling" },
  { art: "/art/mood-missing.webp", text: "Theo is missing you" },
  { art: "/landing/ramen.webp", text: "Date night: ramen and a film" },
  { art: "/art/draw_guess.webp", text: "Ama drew you something" },
  { art: "/landing/airplane.webp", text: "12 days until London" },
  { art: "/art/fire.webp", text: "After Dark: you both said yes" },
] as const;

function Row({ hidden = false }: { hidden?: boolean }) {
  return (
    <ul
      aria-hidden={hidden || undefined}
      className="m-0 flex shrink-0 list-none items-center gap-3 p-0 pr-3"
    >
      {MOMENTS.map((m) => (
        <li
          key={m.text}
          className="bg-s1 border-line flex h-14 shrink-0 items-center gap-3 rounded-full border py-2 pr-5 pl-2.5"
        >
          <Image src={m.art} alt="" width={36} height={36} className="h-9 w-9" />
          <span className="text-text text-base font-medium whitespace-nowrap">{m.text}</span>
        </li>
      ))}
    </ul>
  );
}

/** A band of the small moments Clink is made of. Pauses on hover; still for reduced motion. */
export function MomentsMarquee() {
  return (
    <section aria-label="Moments from Clink" data-loop className="border-line border-y py-6">
      <div className="lp-marquee-wrap overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]">
        <div className="lp-marquee flex w-max">
          <Row />
          <Row hidden />
        </div>
      </div>
    </section>
  );
}

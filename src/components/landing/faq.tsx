import { Plus } from "@phosphor-icons/react/dist/ssr";

const FAQS = [
  {
    q: "Who is Clink for?",
    a: "Adults aged 18 and over who are in a relationship, especially when you live in different places. You each make an account and link to each other.",
  },
  {
    q: "Does my partner need an account too?",
    a: "Yes. One account links to exactly one person. Sign up, then send your partner your invite code, or enter theirs.",
  },
  {
    q: "Do I need to download anything?",
    a: "No app store needed. Open Clink in your browser and add it to your home screen. It then opens like any other app on your device.",
  },
  {
    q: "What is After Dark?",
    a: "A private space for the spicier stuff. It has its own PIN, it only opens when you both say yes, and its content is never available to our team.",
  },
  {
    q: "What if we break up?",
    a: "You can unlink or block at any time, even from inside After Dark. Your partner gets a short, neutral notice and private media is wiped for both of you within an hour.",
  },
  {
    q: "Do you sell my data?",
    a: "Never. We collect only what Clink needs to work. You can download your data or delete your account any time in Settings.",
  },
] as const;

/** Native disclosure widgets: keyboard and screen reader support for free, no JS. */
export function Faq() {
  return (
    <section
      aria-labelledby="faq-title"
      className="mx-auto grid max-w-[1440px] gap-10 px-4 py-24 md:px-8 md:py-32 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20 xl:px-12"
    >
      <h2
        id="faq-title"
        data-reveal
        className="display m-0 text-[clamp(2.25rem,4.4vw,3.75rem)] leading-[1] tracking-[-0.03em] lg:sticky lg:top-28 lg:self-start"
      >
        Questions, answered.
      </h2>
      <div className="lp-faq border-line divide-line divide-y border-y">
        {FAQS.map((f) => (
          <details key={f.q} className="group">
            <summary className="text-text flex min-h-[72px] cursor-pointer items-center justify-between gap-6 py-5 text-lg font-bold md:text-xl">
              {f.q}
              <span className="border-line group-hover:border-accent flex h-10 w-10 flex-none items-center justify-center rounded-full border transition-colors">
                <Plus size={18} weight="bold" aria-hidden className="lp-faq-icon" />
              </span>
            </summary>
            <p className="lp-faq-body text-muted m-0 max-w-[60ch] pb-6 text-base leading-relaxed">
              {f.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

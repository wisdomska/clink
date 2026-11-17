"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Cards,
  Check,
  EyeSlash,
  HeartStraight,
  LockSimple,
  SkipForward,
} from "@phosphor-icons/react";
import { useCouple, useCoupleEvent } from "@/features/couple/context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { PartnerMark } from "@/components/ui/heading";
import { toast } from "@/components/ui/toast";
import { cn } from "@/components/ui/cn";
import { useReducedMotion } from "@/lib/feedback";
import { TIERS } from "@/lib/dark-logic";
import { darkFetch, useDarkState } from "./api";
import { PageBar } from "@/components/clink/page-bar";

interface DeckCard {
  id: string;
  text: string;
  mine: { answer: string | null; passed: boolean } | null;
  theirs: { answered: boolean; passed: boolean; answer: string | null } | null;
}
interface DeckData {
  title: string;
  total: number;
  current: number | null;
  cards: DeckCard[];
}

type Status = "new" | "waiting" | "sealed" | "both" | "passed" | "theypassed";

/** Where a card stands, from your side. */
function statusOf(c: DeckCard): Status {
  if (!c.mine) return c.theirs?.answered ? "waiting" : "new";
  if (c.mine.passed) return "passed";
  if (c.theirs?.passed) return "theypassed";
  return c.theirs?.answered ? "both" : "sealed";
}

const STATUS_LABEL: Record<Status, string> = {
  new: "new",
  waiting: "they answered",
  sealed: "answered, sealed",
  both: "both answered",
  passed: "passed",
  theypassed: "they passed",
};

// One spring for every card in the fan, so the deck moves as one object.
const SPRING = { type: "spring", stiffness: 340, damping: 32, mass: 0.9 } as const;

/** DARK-03: a deck you can flip through, back and forth; focus a card to answer it. */
export function Deck({ tier }: { tier: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { partner, send } = useCouple();
  const { data: s } = useDarkState();
  const reduced = useReducedMotion();
  const key = ["deck", tier];
  const { data, isLoading, error } = useQuery({
    queryKey: key,
    queryFn: () => darkFetch<DeckData>(`/api/dark/decks/${tier}`),
    retry: false,
    staleTime: 30_000,
  });
  const [index, setIndex] = useState<number | null>(null);
  const [dir, setDir] = useState(1);
  const [focused, setFocused] = useState(false);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState<null | "answer" | "pass">(null);

  // Open where you left off (once per deck), then let the person roam freely.
  const at = index ?? (data ? (data.current ?? Math.max(0, data.total - 1)) : 0);
  const cards = data?.cards ?? [];
  const card = cards[at];

  const idx = (TIERS as readonly string[]).indexOf(tier);
  const locked = Boolean(error) || (s ? idx >= s.rank : false);
  const missing: Array<{ text: string; href?: string; action?: string }> = [];
  if (s && locked) {
    if (tier === "Unhinged" && !s.me.verified)
      missing.push({
        text: "Sign the 18+ declaration",
        href: "/dark/consent?verify=1",
        action: "Verify",
      });
    if (tier === "Unhinged" && !s.partner.verified)
      missing.push({ text: `${partner.name} signs the 18+ declaration too` });
    if (!s.me.tiers.includes(tier))
      missing.push({
        text: `Turn on ${tier} in your tiers`,
        href: "/dark/consent",
        action: "Your tiers",
      });
    if (!s.partner.tiers.includes(tier)) missing.push({ text: `${partner.name} turns on ${tier}` });
    if (idx > 0 && s.rank < idx)
      missing.push({
        text: `Every tier before it is open for you both (${TIERS.slice(0, idx).join(", ")})`,
      });
  }
  useCoupleEvent("dark.deck", () => qc.invalidateQueries({ queryKey: key }));
  const open = TIERS.slice(0, s?.rank ?? 0);

  function go(to: number) {
    if (!cards.length || focused) return;
    const n = Math.max(0, Math.min(cards.length - 1, to));
    if (n === at) return;
    setDir(n > at ? 1 : -1);
    setIndex(n);
  }

  // Arrow keys flip the deck (not while typing an answer).
  const goRef = useRef(go);
  useEffect(() => {
    goRef.current = go;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowLeft") goRef.current(at - 1);
      if (e.key === "ArrowRight") goRef.current(at + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [at]);

  function setCard(next: DeckCard) {
    qc.setQueryData<DeckData>(key, (d) =>
      d ? { ...d, cards: d.cards.map((c) => (c.id === next.id ? next : c)) } : d,
    );
  }

  async function submit(pass: boolean) {
    if (!card || busy) return;
    const before = card;
    const text = answer.trim();
    if (!pass && !text) return;
    setBusy(pass ? "pass" : "answer");
    // Show it straight away; the server's version (with any reveal) replaces it.
    setCard({ ...card, mine: { answer: pass ? null : text, passed: pass } });
    setFocused(false);
    if (pass && at < cards.length - 1) go(at + 1);
    try {
      const r = await darkFetch<{ revealed: boolean; card: DeckCard }>(`/api/dark/decks/${tier}`, {
        cardId: card.id,
        answer: pass ? undefined : text,
        pass,
      });
      setCard(r.card);
      setAnswer("");
      send("dark.deck", {});
      if (pass) toast("Passed. Next card.");
      else if (r.revealed) toast.ok("You both answered. Here's theirs.");
    } catch (e) {
      setCard(before);
      toast.err(e instanceof Error ? e.message : "That didn't save. Try again.");
    } finally {
      setBusy(null);
    }
  }

  function startAnswer() {
    setAnswer(card?.mine?.answer ?? "");
    setFocused(true);
  }

  const st = card ? statusOf(card) : "new";
  const nextNew = cards.findIndex((c, i) => i > at && !c.mine);
  const firstNew = cards.findIndex((c) => !c.mine);

  return (
    <main className="an-screen mx-auto flex min-h-dvh max-w-[600px] flex-col gap-4 px-4 pt-[var(--screen-pt)] pb-8 [--screen-pt:calc(env(safe-area-inset-top)+8px)] md:[--screen-pt:2.0rem]">
      <PageBar
        title={`${tier} deck`}
        back="/dark/home"
        actions={
          data && !locked ? (
            <div className="mono text-muted text-sm tabular-nums" aria-live="polite">
              {at + 1}/{data.total}
            </div>
          ) : undefined
        }
      />
      {open.length > 1 && !focused && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto" role="tablist" aria-label="Decks">
          {open.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={t === tier}
              onClick={() => router.replace(`/dark/decks/${t}`)}
              className="press h-9 flex-none cursor-pointer rounded-full border px-3.5 text-sm font-medium"
              style={{
                borderColor: t === tier ? "var(--accent-dark)" : "var(--line)",
                background: t === tier ? "var(--accent-dark)" : "transparent",
                color: t === tier ? "var(--on-accent)" : "var(--text)",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {locked && !isLoading ? (
        <div className="an-reveal mt-4 flex flex-col gap-4">
          <div className="display text-[32px] leading-[1.05]">{tier} isn&apos;t open yet</div>
          <p className="text-muted m-0 text-base">
            A tier opens only when you both choose it
            {tier === "Unhinged" ? ", and Unhinged needs you both verified" : ""}. Here&apos;s
            what&apos;s left:
          </p>
          <ul className="rounded-card border-line bg-s1 divide-line m-0 flex list-none flex-col divide-y overflow-hidden border p-0">
            {(missing.length ? missing : [{ text: "Waiting on you both to agree" }]).map((m) => (
              <li key={m.text} className="flex items-center gap-3 p-3.5">
                <span className="bg-ember h-2.5 w-2.5 flex-none rounded-full" aria-hidden />
                <span className="flex-1 text-sm">{m.text}</span>
                {m.href && (
                  <Button size="xs" onClick={() => router.push(m.href!)}>
                    {m.action}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : isLoading || !card ? (
        <div className="mt-2 flex flex-col gap-4" aria-busy>
          <div className="an-skel rounded-card bg-s2 mx-auto h-[300px] w-full max-w-[380px]" />
          <div className="an-skel bg-s2 h-11 rounded-full" />
        </div>
      ) : (
        <>
          {data?.current === null && !focused && (
            <p className="text-muted m-0 text-sm">
              You&apos;ve been through the whole deck. Flip back to any card, or try another tier.
            </p>
          )}

          {/* The fan: the chosen card in front, its neighbours peeking either side. */}
          <div className="-mx-4 overflow-x-clip px-4 py-2">
            <div
              className="relative mx-auto h-[290px] w-[78%] max-w-[360px] select-none"
              aria-roledescription="carousel"
              aria-label={`${tier} cards`}
            >
              <AnimatePresence initial={false} custom={dir}>
                {cards.map((c, i) => {
                  const off = i - at;
                  if (Math.abs(off) > 2) return null;
                  const front = off === 0;
                  const hidden = focused && !front;
                  return (
                    <motion.div
                      key={c.id}
                      custom={dir}
                      className="absolute inset-0"
                      style={{ zIndex: 10 - Math.abs(off) }}
                      initial={
                        reduced
                          ? { opacity: 0 }
                          : { x: `${dir * 60}%`, rotate: dir * 12, scale: 0.84, opacity: 0 }
                      }
                      animate={
                        reduced
                          ? { opacity: hidden ? 0 : front ? 1 : 0.5 }
                          : {
                              x: hidden ? `${off * 30}%` : `${off * 20}%`,
                              y: front && focused ? -6 : Math.abs(off) * 12,
                              rotate: off * 6,
                              scale: front ? (focused ? 1.03 : 1) : 1 - Math.abs(off) * 0.08,
                              opacity: hidden ? 0 : front ? 1 : 0.8 - Math.abs(off) * 0.22,
                            }
                      }
                      exit={
                        reduced
                          ? { opacity: 0 }
                          : { x: `${-dir * 60}%`, rotate: -dir * 12, scale: 0.84, opacity: 0 }
                      }
                      transition={reduced ? { duration: 0.15 } : SPRING}
                      drag={front && !focused && !reduced ? "x" : false}
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.5}
                      onDragEnd={(_e, info: PanInfo) => {
                        if (info.offset.x < -60 || info.velocity.x < -400) go(at + 1);
                        else if (info.offset.x > 60 || info.velocity.x > 400) go(at - 1);
                      }}
                    >
                      {front ? (
                        <CardFace tier={tier} card={c} n={i + 1} status={statusOf(c)} />
                      ) : (
                        <button
                          type="button"
                          tabIndex={-1}
                          aria-hidden
                          disabled={focused}
                          onClick={() => go(i)}
                          className="block h-full w-full cursor-pointer border-0 bg-transparent p-0 text-left"
                        >
                          <CardBack />
                        </button>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          <AnimatePresence mode="popLayout" initial={false}>
            {focused ? (
              <motion.div
                key="answer"
                className="flex flex-col gap-3"
                initial={{ opacity: 0, y: reduced ? 0 : 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              >
                <div className="text-muted flex items-center gap-2 text-sm">
                  <PartnerMark who="b" />
                  {card.theirs?.answered
                    ? `${partner.name} already answered. Yours reveals both.`
                    : `${partner.name} sees it only once they answer too.`}
                </div>
                <Textarea
                  aria-label="Your answer"
                  placeholder={`Your answer. Only ${partner.name} sees it.`}
                  value={answer}
                  maxLength={1000}
                  autoFocus
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setFocused(false);
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void submit(false);
                  }}
                />
                <div className="grid grid-cols-[2fr_1fr] gap-2">
                  <Button
                    disabled={!answer.trim()}
                    loading={busy === "answer"}
                    onClick={() => submit(false)}
                  >
                    <LockSimple size={16} weight="bold" aria-hidden /> Seal my answer
                  </Button>
                  <Button variant="secondary" onClick={() => setFocused(false)}>
                    Back to deck
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="browse"
                className="flex flex-col gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <CardState card={card} status={st} partner={partner.name} />
                <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
                  <Button
                    variant="secondary"
                    aria-label="Previous card"
                    disabled={at === 0}
                    onClick={() => go(at - 1)}
                    className="w-12 !px-0"
                  >
                    <ArrowLeft size={18} weight="bold" aria-hidden />
                  </Button>
                  {st === "new" || st === "waiting" || st === "passed" ? (
                    <Button onClick={startAnswer}>
                      {st === "passed" ? "Answer it now" : "Answer this card"}
                    </Button>
                  ) : st === "sealed" ? (
                    <Button variant="secondary" onClick={startAnswer}>
                      Change my answer
                    </Button>
                  ) : nextNew >= 0 ? (
                    <Button onClick={() => go(nextNew)}>Next new card</Button>
                  ) : (
                    <span />
                  )}
                  <Button
                    variant="secondary"
                    aria-label="Next card"
                    disabled={at >= cards.length - 1}
                    onClick={() => go(at + 1)}
                    className="w-12 !px-0"
                  >
                    <ArrowRight size={18} weight="bold" aria-hidden />
                  </Button>
                </div>
                {(st === "new" || st === "waiting") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={busy === "pass"}
                    onClick={() => submit(true)}
                    className="self-center"
                  >
                    <SkipForward size={16} aria-hidden /> Pass on this one
                  </Button>
                )}
                {firstNew >= 0 && firstNew !== at && nextNew < 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => go(firstNew)}
                    className="self-center"
                  >
                    Back to the first one you haven&apos;t answered
                  </Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {!focused && <DeckStrip cards={cards} at={at} onPick={go} reduced={reduced} />}
        </>
      )}
    </main>
  );
}

/** A neighbouring card, face down: the deck's back, no text to read past. */
function CardBack() {
  return (
    <div
      className="rounded-card border-line bg-s2 relative flex h-full items-center justify-center overflow-hidden border shadow-[0_18px_40px_-18px_rgba(0,0,0,.7)]"
      style={{
        backgroundImage:
          "repeating-linear-gradient(135deg, color-mix(in oklab, var(--accent-dark) 14%, transparent) 0 2px, transparent 2px 14px)",
      }}
    >
      <span className="border-ember/40 bg-s1 flex h-14 w-14 items-center justify-center rounded-full border">
        <Cards size={26} className="text-ember" aria-hidden />
      </span>
    </div>
  );
}

/** The card itself. */
function CardFace({
  tier,
  card,
  n,
  status,
}: {
  tier: string;
  card: DeckCard;
  n: number;
  status: Status;
}) {
  return (
    <div
      className={cn(
        "rounded-card border-line relative flex h-full flex-col justify-between gap-4 overflow-hidden border px-5 py-5 shadow-[0_18px_40px_-18px_rgba(0,0,0,.7)]",
        "bg-s1",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="bg-ember text-on-accent rounded-full px-2.5 py-1 text-xs font-bold">
          {tier}
        </span>
        <span className="mono text-faint text-xs tabular-nums">No. {n}</span>
      </div>
      <div
        className={cn(
          "display leading-[1.12]",
          card.text.length > 80 ? "text-[19px]" : "text-[23px]",
        )}
      >
        {card.text}
      </div>
      <StatusChip status={status} />
    </div>
  );
}

function StatusChip({ status }: { status: Status }) {
  const map: Record<Status, { icon: React.ReactNode; text: string; cls: string }> = {
    new: { icon: null, text: "New", cls: "border-line text-muted" },
    waiting: {
      icon: <PartnerMark who="b" />,
      text: "They answered",
      cls: "border-ember text-text",
    },
    sealed: {
      icon: <LockSimple size={12} weight="bold" aria-hidden />,
      text: "Sealed",
      cls: "border-line text-text",
    },
    both: {
      icon: <HeartStraight size={12} weight="fill" aria-hidden />,
      text: "Both answered",
      cls: "bg-ember text-on-accent border-transparent",
    },
    passed: {
      icon: <SkipForward size={12} aria-hidden />,
      text: "You passed",
      cls: "border-line text-faint",
    },
    theypassed: {
      icon: <EyeSlash size={12} aria-hidden />,
      text: "They passed",
      cls: "border-line text-faint",
    },
  };
  const m = map[status];
  return (
    <span
      className={cn(
        "flex items-center gap-1.5 self-start rounded-full border px-2.5 py-1 text-xs font-semibold",
        m.cls,
      )}
    >
      {m.icon}
      {m.text}
    </span>
  );
}

/** What's on this card between you two, under the deck. */
function CardState({ card, status, partner }: { card: DeckCard; status: Status; partner: string }) {
  if (status === "both" || status === "theypassed" || status === "sealed")
    return (
      <div className="grid grid-cols-2 gap-1.5">
        <div className="rounded-input border-line bg-s2 flex flex-col gap-2 border p-3.5">
          <span className="text-muted flex items-center gap-1.5 text-xs font-medium">
            <span className="bg-ember h-2.5 w-2.5 rounded-full" aria-hidden /> You
          </span>
          <span className="text-base leading-[1.4] break-words">{card.mine?.answer}</span>
        </div>
        <div className="rounded-input border-line bg-s2 flex flex-col gap-2 border p-3.5">
          <span className="text-muted flex items-center gap-1.5 text-xs font-medium">
            <PartnerMark who="b" /> {partner}
          </span>
          {status === "both" ? (
            <span className="text-base leading-[1.4] break-words">{card.theirs?.answer}</span>
          ) : status === "theypassed" ? (
            <span className="text-faint text-sm">Passed on this one.</span>
          ) : (
            <span className="text-faint flex items-center gap-1.5 text-sm">
              <LockSimple size={14} aria-hidden /> Sealed. It reveals when {partner} answers.
            </span>
          )}
        </div>
      </div>
    );
  return (
    <p className="text-muted m-0 flex items-center gap-2 text-sm">
      {status === "waiting" ? (
        <>
          <PartnerMark who="b" /> {partner} answered. Answer to see both.
        </>
      ) : status === "passed" ? (
        "You passed. You can still answer it any time."
      ) : (
        `Answer first and ${partner} sees it only once they answer too.`
      )}
    </p>
  );
}

/** Every card in the deck, small, to jump anywhere. */
function DeckStrip({
  cards,
  at,
  onPick,
  reduced,
}: {
  cards: DeckCard[];
  at: number;
  onPick: (i: number) => void;
  reduced: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>(`[data-i="${at}"]`);
    el?.scrollIntoView({
      block: "nearest",
      inline: "center",
      behavior: reduced ? "auto" : "smooth",
    });
  }, [at, reduced]);
  return (
    <div className="flex flex-col gap-2">
      <div className="text-faint flex items-center justify-between text-xs">
        <span>The deck</span>
        <span className="flex items-center gap-3">
          <Legend cls="bg-ember" label="both" />
          <Legend cls="bg-ember/35" label="yours" />
          <Legend cls="border border-line" label="new" />
        </span>
      </div>
      <div
        ref={ref}
        className="no-scrollbar -mx-4 flex snap-x gap-1.5 overflow-x-auto px-4 pt-1 pb-2"
        role="group"
        aria-label="Jump to a card"
      >
        {cards.map((c, i) => {
          const st = statusOf(c);
          const here = i === at;
          return (
            <button
              key={c.id}
              type="button"
              data-i={i}
              aria-label={`Card ${i + 1}, ${STATUS_LABEL[st]}`}
              aria-current={here || undefined}
              onClick={() => onPick(i)}
              className={cn(
                "press mono relative flex h-12 w-9 flex-none cursor-pointer snap-center flex-col items-center justify-center rounded-[10px] border text-[11px] tabular-nums transition-transform duration-200",
                here && "border-ember -translate-y-1",
                !here && "border-line",
                st === "both"
                  ? "bg-ember text-on-accent"
                  : st === "sealed"
                    ? "bg-ember/35 text-text"
                    : st === "passed" || st === "theypassed"
                      ? "bg-s1 text-faint line-through"
                      : "bg-s2 text-muted",
              )}
            >
              {i + 1}
              {st === "waiting" && (
                <span
                  className="bg-ember absolute top-1 right-1 h-1.5 w-1.5 rounded-full"
                  aria-hidden
                />
              )}
              {st === "both" && <Check size={10} weight="bold" aria-hidden />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={cn("h-2.5 w-2 rounded-[3px]", cls)} aria-hidden /> {label}
    </span>
  );
}

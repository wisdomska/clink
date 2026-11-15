"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "@phosphor-icons/react";
import { useCouple, useCoupleEvent } from "@/features/couple/context";
import { Button, IconButton } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { PartnerMark } from "@/components/ui/heading";
import { toast } from "@/components/ui/toast";
import { TIERS } from "@/lib/dark-logic";
import { darkFetch, useDarkState } from "./api";

interface DeckData {
  title: string;
  total: number;
  position: number;
  card: { id: string; text: string; partnerAnswered: boolean } | null;
  reveal: { cardId: string; text: string; mine: string; theirs: string } | null;
}

/** DARK-03: card, both-answered reveal, pass. */
export function Deck({ tier }: { tier: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { partner, send } = useCouple();
  const { data: s } = useDarkState();
  const [answer, setAnswer] = useState("");
  const [seenReveal, setSeenReveal] = useState<string | null>(null);
  const key = ["deck", tier];
  const { data, isLoading, error } = useQuery({
    queryKey: key,
    queryFn: () => darkFetch<DeckData>(`/api/dark/decks/${tier}`),
    retry: false,
  });
  const idx = (TIERS as readonly string[]).indexOf(tier);
  const locked = Boolean(error) || (s ? idx >= s.rank : false);
  // What's still missing before this tier opens, in plain words.
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
  const reveal = data?.reveal && data.reveal.cardId !== seenReveal ? data.reveal : null;
  const open = TIERS.slice(0, s?.rank ?? 0);

  async function submit(pass: boolean) {
    if (!data?.card) return;
    const r = await darkFetch<{ revealed: boolean }>(`/api/dark/decks/${tier}`, {
      cardId: data.card.id,
      answer: pass ? undefined : answer,
      pass,
    });
    setAnswer("");
    send("dark.deck", {});
    if (pass) toast("Passed. Next card.");
    else if (!r.revealed) toast(`Sealed. It reveals when ${partner.name} answers.`);
    void qc.invalidateQueries({ queryKey: key });
  }

  return (
    <main className="an-screen mx-auto flex min-h-dvh max-w-[600px] flex-col gap-4 px-4 pt-[calc(env(safe-area-inset-top)+8px)] pb-8 md:pt-8">
      <div className="flex items-center gap-3">
        <IconButton label="Back" onClick={() => router.push("/dark/home")}>
          <ArrowLeft size={20} />
        </IconButton>
        <div className="text-muted flex-1 text-sm font-medium">{tier} deck</div>
        {data && (
          <div className="mono text-sm">
            {data.position}/{data.total}
          </div>
        )}
      </div>
      {open.length > 1 && (
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
          <div className="display text-[32px] leading-[1.05]">
            {tier} isn&apos;t <em>open</em> yet
          </div>
          <p className="text-muted m-0 text-base">
            A tier opens only when you both choose it
            {tier === "Unhinged" ? ", and Unhinged needs you both verified" : ""}. Here&apos;s
            what&apos;s left:
          </p>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {(missing.length ? missing : [{ text: "Waiting on you both to agree" }]).map((m) => (
              <li key={m.text} className="bg-s2 flex items-center gap-3 rounded-2xl p-3.5">
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
      ) : isLoading ? (
        <div className="an-skel rounded-card bg-s2 mt-2 h-[220px]" />
      ) : reveal ? (
        <>
          <Card tier={tier} text={reveal.text} />
          <div className="an-reveal grid grid-cols-2 gap-1.5">
            <div className="bg-s2 flex flex-col gap-2 rounded-[20px_6px_6px_20px] p-3.5">
              <span className="mono text-muted flex items-center gap-1.5 text-xs">
                <span className="bg-ember h-2.5 w-2.5 rounded-full" aria-hidden /> YOU
              </span>
              <span className="text-base leading-[1.4]">{reveal.mine}</span>
            </div>
            <div className="bg-s2 flex flex-col gap-2 rounded-[6px_20px_20px_6px] p-3.5">
              <span className="mono text-muted flex items-center gap-1.5 text-xs uppercase">
                <PartnerMark who="b" /> {partner.name}
              </span>
              <span className="text-base leading-[1.4]">{reveal.theirs}</span>
            </div>
          </div>
          <Button onClick={() => setSeenReveal(reveal.cardId)}>Next card</Button>
        </>
      ) : data?.card ? (
        <>
          <Card tier={tier} text={data.card.text} />
          <div className="text-muted flex items-center gap-2 text-sm">
            <PartnerMark who="b" />
            {data.card.partnerAnswered
              ? `${partner.name} answered. Yours reveals both.`
              : `Answer first and ${partner.name} sees it only once they answer too.`}
          </div>
          <Textarea
            aria-label="Your answer"
            placeholder={`Your answer. Only ${partner.name} sees it.`}
            value={answer}
            maxLength={1000}
            onChange={(e) => setAnswer(e.target.value)}
          />
          <div className="grid grid-cols-[2fr_1fr] gap-2">
            <Button disabled={!answer.trim()} onClick={() => submit(false)}>
              Answer
            </Button>
            <Button variant="secondary" onClick={() => submit(true)}>
              Pass
            </Button>
          </div>
        </>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          <div className="display text-[28px] leading-[1.05]">That&apos;s the whole deck.</div>
          <p className="text-muted m-0 text-base">
            New cards land with each content drop. Try another tier, or the wheel.
          </p>
        </div>
      )}
    </main>
  );
}

function Card({ tier, text }: { tier: string; text: string }) {
  return (
    <div className="relative mt-2 flex-none">
      <div
        aria-hidden
        className="rounded-card bg-s2 absolute"
        style={{ inset: "8px -6px -8px 6px", transform: "rotate(3deg)" }}
      />
      <div className="rounded-card border-line bg-s1 relative flex min-h-[220px] flex-col justify-between gap-5 border px-5 py-6">
        <span className="bg-ember text-on-accent self-start rounded-full px-2.5 py-1 text-xs font-bold">
          {tier}
        </span>
        <div className="display text-[28px] leading-[1.1]">{text}</div>
      </div>
    </div>
  );
}

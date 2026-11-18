"use client";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart } from "@phosphor-icons/react";
import { useCouple } from "@/features/couple/context";
import { Button } from "@/components/ui/button";
import { Lead } from "@/components/ui/heading";
import { Segmented } from "@/components/ui/segmented";
import { toast } from "@/components/ui/toast";
import { darkFetch } from "./api";
import { PageBar } from "@/components/clink/page-bar";
import { EmptyState } from "@/components/ui/empty-state";

interface MatchData {
  items: Array<{ id: string; text: string; tier: string }>;
  mine: Record<string, "yes" | "no" | "maybe">;
  partnerAnswered: number;
  matches: Array<{ item_id: string; text: string; tier: string; kind: "yes" | "maybe" }>;
}

/** DARK-04: answering, waiting, matches revealed. A "no" is never shown to anyone. */
export function DesireMatch() {
  const qc = useQueryClient();
  const { partner } = useCouple();
  const [tab, setTab] = useState<"answer" | "matches">("answer");
  const { data } = useQuery({
    queryKey: ["match"],
    queryFn: () => darkFetch<MatchData>("/api/dark/match"),
  });
  const [local, setLocal] = useState<Record<string, string>>({});
  const mine = useMemo(() => ({ ...(data?.mine ?? {}), ...local }), [data, local]);
  const answered = Object.keys(mine).length;
  const total = data?.items.length ?? 0;

  async function pick(id: string, answer: "yes" | "no" | "maybe") {
    const before = local[id];
    setLocal((l) => ({ ...l, [id]: answer }));
    try {
      await darkFetch("/api/dark/match", { itemId: id, answer });
      void qc.invalidateQueries({ queryKey: ["match"] });
    } catch {
      setLocal((l) => {
        const next = { ...l };
        if (before === undefined) delete next[id];
        else next[id] = before;
        return next;
      });
      toast.err("Couldn't save that answer. Try again.");
    }
  }

  return (
    <main className="an-screen mx-auto flex min-h-dvh max-w-[640px] flex-col gap-4 px-4 pt-[var(--screen-pt)] pb-8 [--screen-pt:calc(env(safe-area-inset-top)+8px)] md:[--screen-pt:2.0rem]">
      <PageBar title="Desire match" back="/dark/home" />
      <Lead>
        Yes, no or maybe, privately. You only ever see the things you both said yes to, or yes and
        maybe. Nobody sees a no.
      </Lead>
      <Segmented
        label="View"
        tone="accent"
        value={tab}
        onChange={setTab}
        options={[
          { value: "answer", label: `Answer ${answered}/${total}` },
          { value: "matches", label: `Matches ${data?.matches.length ?? 0}` },
        ]}
      />
      {tab === "answer" ? (
        <ul className="rounded-card border-line bg-s1 divide-line m-0 flex list-none flex-col divide-y overflow-hidden border p-0">
          {(data?.items ?? []).map((it) => (
            <li key={it.id} className="flex flex-col gap-2.5 p-4">
              <div className="flex items-start justify-between gap-3">
                <span className="text-base font-medium">{it.text}</span>
                <span className="text-faint flex-none text-xs">{it.tier}</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label={it.text}>
                {(["yes", "maybe", "no"] as const).map((a) => (
                  <button
                    key={a}
                    type="button"
                    role="radio"
                    aria-checked={mine[it.id] === a}
                    onClick={() => pick(it.id, a)}
                    className="press h-11 cursor-pointer rounded-full border text-sm font-medium capitalize"
                    style={{
                      borderColor: mine[it.id] === a ? "var(--accent-dark)" : "var(--line)",
                      background: mine[it.id] === a ? "var(--accent-dark)" : "transparent",
                      color: mine[it.id] === a ? "var(--on-accent)" : "var(--text)",
                    }}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      ) : data?.matches.length ? (
        <ul className="rounded-card border-line bg-s1 divide-line m-0 flex list-none flex-col divide-y overflow-hidden border p-0">
          {data.matches.map((m) => (
            <li key={m.item_id} className="an-reveal flex items-center gap-3 p-4">
              <Heart
                size={22}
                weight={m.kind === "yes" ? "fill" : "regular"}
                className="text-ember flex-none"
                aria-label={m.kind === "yes" ? "You both said yes" : "Yes and maybe"}
              />
              <span className="flex-1 text-base">{m.text}</span>
              <span className="text-muted text-xs">
                {m.kind === "yes" ? "Both yes" : "Yes + maybe"}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          art="sparkling_heart"
          title="No matches yet."
          actions={
            <Button variant="secondary" size="md" onClick={() => setTab("answer")}>
              Keep answering
            </Button>
          }
        >
          {partner.name} has answered {data?.partnerAnswered ?? 0} of {total}. Matches show up the
          moment you both land on one.
        </EmptyState>
      )}
    </main>
  );
}

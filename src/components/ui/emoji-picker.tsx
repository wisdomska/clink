"use client";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { MagnifyingGlass, ClockCounterClockwise, X } from "@phosphor-icons/react";
import { cn } from "./cn";
import { EMOJI_GROUPS } from "./emoji-data";
import { scoped } from "@/lib/account-scope";

const RECENT_KEY = "clink.recentEmoji.v1";

function readRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(scoped(RECENT_KEY)) ?? "[]") as string[];
  } catch {
    return [];
  }
}
function pushRecent(e: string) {
  try {
    const next = [e, ...readRecent().filter((x) => x !== e)].slice(0, 24);
    localStorage.setItem(scoped(RECENT_KEY), JSON.stringify(next));
  } catch {
    /* storage blocked */
  }
}

const firstEmoji = (v: string) => {
  const g = [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(v.trim())][0]
    ?.segment;
  return g && /\p{Extended_Pictographic}/u.test(g) ? g : null;
};

/**
 * A real emoji grid: recents, groups you can jump between, and search by word.
 * Typing or pasting an emoji into the search box picks it straight away.
 */
export function EmojiPicker({
  onPick,
  onClose,
  label = "Pick an emoji",
}: {
  onPick: (e: string) => void;
  onClose?: () => void;
  label?: string;
}) {
  const [q, setQ] = useState("");
  const [recent] = useState<string[]>(() => (typeof window === "undefined" ? [] : readRecent()));
  const [group, setGroup] = useState<string>(recent.length ? "recent" : EMOJI_GROUPS[0]!.id);

  const pick = (e: string) => {
    pushRecent(e);
    onPick(e);
  };

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return null;
    const seen = new Set<string>();
    return EMOJI_GROUPS.flatMap((g) => g.items)
      .filter((i) => i.words.includes(t) && !seen.has(i.e) && seen.add(i.e))
      .map((i) => i.e);
  }, [q]);

  const tabs = [
    ...(recent.length ? [{ id: "recent", label: "Recent", icon: "recent" as const }] : []),
    ...EMOJI_GROUPS.map((g) => ({ id: g.id, label: g.label, icon: g.items[0]!.e })),
  ];
  const shown =
    results ??
    (group === "recent"
      ? recent
      : (EMOJI_GROUPS.find((g) => g.id === group)?.items ?? []).map((i) => i.e));

  return (
    <div className="flex flex-col gap-2" role="group" aria-label={label}>
      <div className="flex items-center gap-2">
        <label className="rounded-input bg-s2 focus-within:border-accent flex h-11 min-w-0 flex-1 items-center gap-2 border border-transparent px-3">
          <MagnifyingGlass size={18} className="text-faint flex-none" aria-hidden />
          <input
            aria-label="Search emoji"
            placeholder="Search, like love or fire"
            value={q}
            onChange={(e) => {
              const em = firstEmoji(e.target.value);
              if (em) return pick(em);
              setQ(e.target.value);
            }}
            className="text-text min-w-0 flex-1 bg-transparent text-base outline-none focus-visible:shadow-none"
          />
        </label>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Back to quick reactions"
            className="press bg-s2 text-muted flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-full border-0"
          >
            <X size={18} weight="bold" />
          </button>
        )}
      </div>

      {!results && (
        <div
          className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1"
          role="tablist"
          aria-label="Emoji groups"
        >
          {tabs.map((t) => {
            const on = t.id === group;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={on}
                aria-label={t.label}
                title={t.label}
                onClick={() => setGroup(t.id)}
                className={cn(
                  "relative flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-lg",
                  on ? "" : "opacity-60 hover:opacity-100",
                )}
              >
                {on && (
                  <motion.span
                    layoutId="emoji-group"
                    className="bg-accent/25 absolute inset-0 rounded-full"
                    transition={{ type: "spring", stiffness: 700, damping: 45, mass: 0.6 }}
                    aria-hidden
                  />
                )}
                <span className="relative">
                  {t.icon === "recent" ? (
                    <ClockCounterClockwise size={20} weight="bold" className="text-text" />
                  ) : (
                    t.icon
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="text-faint text-xs font-semibold">
        {results
          ? `${results.length} ${results.length === 1 ? "match" : "matches"}`
          : tabs.find((t) => t.id === group)?.label}
      </div>
      <div
        className="no-scrollbar grid max-h-[248px] grid-cols-8 gap-0.5 overflow-y-auto"
        key={results ? "search" : group}
      >
        {shown.map((e, i) => (
          <motion.button
            key={e}
            type="button"
            onClick={() => pick(e)}
            aria-label={e}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            // The whole grid is in within ~150 ms (was up to 320 ms + a spring tail).
            transition={{
              delay: Math.min(i, 24) * 0.004,
              duration: 0.12,
              ease: [0.23, 1, 0.32, 1],
            }}
            whileHover={{ scale: 1.15, transition: { duration: 0.1 } }}
            whileTap={{ scale: 0.88, transition: { duration: 0.06 } }}
            className="hover:bg-s2 flex aspect-square cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent text-[26px] leading-none"
          >
            {e}
          </motion.button>
        ))}
        {results && !results.length && (
          <p className="text-muted col-span-8 m-0 py-6 text-center text-sm">
            Nothing for &ldquo;{q}&rdquo;. Try another word, or paste any emoji.
          </p>
        )}
      </div>
    </div>
  );
}

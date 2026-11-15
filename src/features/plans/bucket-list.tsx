"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Check, Plus, Trash } from "@phosphor-icons/react";
import { IconButton, Button } from "@/components/ui/button";
import { Display } from "@/components/ui/heading";
import { useCouple } from "@/features/couple/context";
import { supabaseBrowser } from "@/lib/supabase/client";
import { subscribeAuthed } from "@/lib/realtime";
import { feedback } from "@/lib/feedback";
import { toast } from "@/components/ui/toast";
import { cn } from "@/components/ui/cn";
import { Confetti } from "@/components/fx/confetti";

const CATS = [
  { key: "do", label: "Do", emoji: "✨" },
  { key: "go", label: "Go", emoji: "✈️" },
  { key: "eat", label: "Eat", emoji: "🍜" },
  { key: "watch", label: "Watch", emoji: "🎬" },
  { key: "learn", label: "Learn", emoji: "📚" },
] as const;
type Cat = (typeof CATS)[number]["key"];

const IDEAS = [
  "Watch the sunrise together",
  "Cook a three-course dinner on video",
  "Take a weekend trip somewhere new",
  "Learn ten words in each other's language",
  "Have a picnic in the rain",
  "Write each other a letter to open in a year",
];

/** "Our list": the things you two want to do together. Shared and live. */
export function BucketList() {
  const router = useRouter();
  const qc = useQueryClient();
  const { me, partner, coupleId } = useCouple();
  const [text, setText] = useState("");
  const [cat, setCat] = useState<Cat>("do");
  const [burst, setBurst] = useState(0);
  const key = ["bucket", coupleId];
  const { data = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data } = await supabaseBrowser()
        .from("bucket_items")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  useEffect(() => {
    const ch = supabaseBrowser()
      .channel(`bucket:${coupleId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bucket_items", filter: `couple_id=eq.${coupleId}` },
        () => void qc.invalidateQueries({ queryKey: ["bucket", coupleId] }),
      );
    return subscribeAuthed(ch);
  }, [coupleId, qc]);

  const add = async (t = text) => {
    const v = t.trim();
    if (!v) return;
    setText("");
    feedback("tap", "pop");
    const { error } = await supabaseBrowser()
      .from("bucket_items")
      .insert({ couple_id: coupleId, created_by: me.id, text: v.slice(0, 140), category: cat });
    if (error) toast.err("Couldn't add that.");
    void qc.invalidateQueries({ queryKey: key });
  };
  const toggle = async (id: string, done: boolean) => {
    if (!done) {
      feedback("success", "win");
      setBurst((b) => b + 1);
    }
    await supabaseBrowser()
      .from("bucket_items")
      .update(
        done
          ? { done_at: null, done_by: null }
          : { done_at: new Date().toISOString(), done_by: me.id },
      )
      .eq("id", id);
    void qc.invalidateQueries({ queryKey: key });
  };
  const remove = async (id: string) => {
    await supabaseBrowser().from("bucket_items").delete().eq("id", id);
    void qc.invalidateQueries({ queryKey: key });
  };

  const open = data.filter((i) => !i.done_at);
  const done = data.filter((i) => i.done_at);
  const emoji = (c: string) => CATS.find((x) => x.key === c)?.emoji ?? "✨";

  return (
    <main className="screen an-screen relative flex max-w-[640px] flex-col gap-4">
      {burst > 0 && (
        <div key={burst} className="pointer-events-none fixed inset-0 z-50">
          <Confetti count={30} seed={burst} />
        </div>
      )}
      <div className="flex items-center gap-3">
        <IconButton label="Back" onClick={() => router.push("/plans")}>
          <ArrowLeft size={20} />
        </IconButton>
        <Display size={36}>
          Our <em>list</em>
        </Display>
      </div>
      <p className="text-muted m-0 text-base">
        Everything you and {partner.name} want to do together.{" "}
        {done.length > 0 && `${done.length} done so far.`}
      </p>

      <form
        className="bg-s1 border-line flex flex-col gap-2.5 rounded-[24px] border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <div className="flex gap-2">
          <input
            aria-label="Add to our list"
            placeholder="Something to do together"
            maxLength={140}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="rounded-input bg-s2 text-text h-12 min-w-0 flex-1 border-0 px-3.5 text-base"
          />
          <Button type="submit" size="md" disabled={!text.trim()} aria-label="Add">
            <Plus size={20} weight="bold" />
          </Button>
        </div>
        <div className="flex gap-1.5" role="radiogroup" aria-label="Kind">
          {CATS.map((c) => (
            <button
              key={c.key}
              type="button"
              role="radio"
              aria-checked={cat === c.key}
              onClick={() => setCat(c.key)}
              className={cn(
                "h-8 cursor-pointer rounded-full border-0 px-3 text-xs font-semibold",
                cat === c.key ? "bg-accent text-on-accent" : "bg-s2 text-muted",
              )}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
      </form>

      {!isLoading && data.length === 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-faint text-sm">Need a start? Tap one:</div>
          <div className="flex flex-wrap gap-1.5">
            {IDEAS.map((idea) => (
              <button
                key={idea}
                type="button"
                onClick={() => void add(idea)}
                className="bg-s2 text-text hover:bg-s3 cursor-pointer rounded-full border-0 px-3 py-2 text-sm"
              >
                {idea}
              </button>
            ))}
          </div>
        </div>
      )}

      <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label="To do">
        <AnimatePresence initial={false}>
          {open.map((i) => (
            <motion.li
              key={i.id}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 40 }}
              className="bg-s1 border-line flex items-center gap-3 rounded-[20px] border p-3"
            >
              <button
                type="button"
                aria-label={`Done: ${i.text}`}
                onClick={() => void toggle(i.id, false)}
                className="bg-s2 hover:bg-accent/30 flex h-10 w-10 flex-none cursor-pointer items-center justify-center rounded-xl border-0 text-lg"
              >
                {emoji(i.category)}
              </button>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold">{i.text}</span>
                <span className="text-faint text-xs">
                  Added by {i.created_by === me.id ? "you" : partner.name}
                </span>
              </span>
              <button
                type="button"
                aria-label={`Remove ${i.text}`}
                onClick={() => void remove(i.id)}
                className="text-faint hover:text-danger flex h-10 w-10 cursor-pointer items-center justify-center border-0 bg-transparent"
              >
                <Trash size={18} />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {done.length > 0 && (
        <section aria-label="Done together" className="flex flex-col gap-2">
          <h2 className="text-muted m-0 text-sm font-semibold">Done together</h2>
          {done.map((i) => (
            <div key={i.id} className="flex items-center gap-3 rounded-[20px] px-3 py-2 opacity-75">
              <button
                type="button"
                aria-label={`Not done: ${i.text}`}
                onClick={() => void toggle(i.id, true)}
                className="bg-accent text-on-accent flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-lg border-0"
              >
                <Check size={16} weight="bold" />
              </button>
              <span className="min-w-0 flex-1 text-sm line-through">{i.text}</span>
              <span className="text-faint text-xs">
                {new Date(i.done_at!).toLocaleDateString([], { day: "numeric", month: "short" })}
              </span>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}

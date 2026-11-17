"use client";
import { useEffect, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  AirplaneTilt,
  BookOpen,
  FilmSlate,
  ForkKnife,
  Plus,
  Sparkle,
  Trash,
} from "@phosphor-icons/react";
import { IconButton, Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/heading";
import { useCouple } from "@/features/couple/context";
import { supabaseBrowser } from "@/lib/supabase/client";
import { subscribeAuthed } from "@/lib/realtime";
import { feedback } from "@/lib/feedback";
import { toast } from "@/components/ui/toast";
import { cn } from "@/components/ui/cn";
import { Confetti } from "@/components/fx/confetti";
import type { Database } from "@/types/database";
import { PAGE, editPaged, flatPaged, nextOffset, type Paged } from "./paged";
import { PageBar } from "@/components/clink/page-bar";

const CATS = [
  { key: "do", label: "Do", Icon: Sparkle },
  { key: "go", label: "Go", Icon: AirplaneTilt },
  { key: "eat", label: "Eat", Icon: ForkKnife },
  { key: "watch", label: "Watch", Icon: FilmSlate },
  { key: "learn", label: "Learn", Icon: BookOpen },
] as const;
type Cat = (typeof CATS)[number]["key"];
type Item = Database["public"]["Tables"]["bucket_items"]["Row"] & { pending?: boolean };

const IDEAS = [
  "Watch the sunrise together",
  "Cook a three-course dinner on video",
  "Take a weekend trip somewhere new",
  "Learn ten words in each other's language",
  "Have a picnic in the rain",
  "Write each other a letter to open in a year",
];

const byCreated = (a: Item, b: Item) => b.created_at.localeCompare(a.created_at);
const byDone = (a: Item, b: Item) => (b.done_at ?? "").localeCompare(a.done_at ?? "");

/** A real checkbox with a 44px hit target and a drawn check. */
function DoneBox({
  checked,
  labelledBy,
  disabled,
  onToggle,
}: {
  checked: boolean;
  labelledBy: string;
  disabled?: boolean;
  onToggle: () => void;
}) {
  const reduced = useReducedMotion();
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      disabled={disabled}
      onClick={onToggle}
      className="group -my-1 -ml-2 flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-full border-0 bg-transparent disabled:cursor-default"
    >
      <span
        aria-hidden
        className={cn(
          "rounded-flap flex h-6 w-6 items-center justify-center border-[1.5px] transition-colors duration-150",
          checked
            ? "bg-accent border-accent text-on-accent"
            : "border-line-strong group-hover:border-accent bg-transparent",
          "group-focus-visible:outline-accent group-focus-visible:outline-2 group-focus-visible:outline-offset-2",
        )}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
          <motion.path
            d="M5 12.5l4.5 4.5L19 7.5"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
            transition={{ duration: reduced ? 0 : 0.22, ease: "easeOut" }}
          />
        </svg>
      </span>
    </button>
  );
}

function SkeletonRows({ n = 3 }: { n?: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, k) => (
        <li key={k} aria-hidden className="flex items-center gap-3 p-3">
          <Skeleton className="rounded-flap h-6 w-6 flex-none" />
          <span className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="rounded-flap h-4 w-3/5" />
            <Skeleton className="rounded-flap h-3 w-1/4" />
          </span>
        </li>
      ))}
    </>
  );
}

/** "Our list": the things you two want to do together. Shared and live. */
export function BucketList() {
  const qc = useQueryClient();
  const { me, partner, coupleId } = useCouple();
  const [text, setText] = useState("");
  const [cat, setCat] = useState<Cat>("do");
  const [burst, setBurst] = useState(0);
  const openKey = ["bucket", coupleId, "open"];
  const doneKey = ["bucket", coupleId, "done"];
  const countKey = ["bucket", coupleId, "count"];

  const openQ = useInfiniteQuery({
    queryKey: openKey,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) =>
      ((
        await supabaseBrowser()
          .from("bucket_items")
          .select("*")
          .is("done_at", null)
          .order("created_at", { ascending: false })
          .range(pageParam, pageParam + PAGE - 1)
      ).data ?? []) as Item[],
    getNextPageParam: nextOffset,
  });
  const doneQ = useInfiniteQuery({
    queryKey: doneKey,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) =>
      ((
        await supabaseBrowser()
          .from("bucket_items")
          .select("*")
          .not("done_at", "is", null)
          .order("done_at", { ascending: false })
          .range(pageParam, pageParam + PAGE - 1)
      ).data ?? []) as Item[],
    getNextPageParam: nextOffset,
  });
  const { data: doneCount = 0 } = useQuery({
    queryKey: countKey,
    queryFn: async () =>
      (
        await supabaseBrowser()
          .from("bucket_items")
          .select("id", { count: "exact", head: true })
          .not("done_at", "is", null)
      ).count ?? 0,
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

  const refresh = () => void qc.invalidateQueries({ queryKey: ["bucket", coupleId] });
  const ensure = (key: readonly unknown[], seed: Item) => {
    if (!qc.getQueryData<Paged<Item>>(key))
      qc.setQueryData<Paged<Item>>(key, { pages: [[seed]], pageParams: [0] });
  };

  const add = async (t = text) => {
    const v = t.trim().slice(0, 140);
    if (!v) return;
    setText("");
    feedback("tap", "pop");
    const temp: Item = {
      id: `pending-${crypto.randomUUID()}`,
      couple_id: coupleId,
      created_by: me.id,
      text: v,
      category: cat,
      done_at: null,
      done_by: null,
      created_at: new Date().toISOString(),
      pending: true,
    };
    const prev = await editPaged<Item>(qc, openKey, (items, i) =>
      i === 0 ? [temp, ...items] : items,
    );
    if (!prev) ensure(openKey, temp);
    const { data: row, error } = await supabaseBrowser()
      .from("bucket_items")
      .insert({ couple_id: coupleId, created_by: me.id, text: v, category: cat })
      .select("*")
      .single();
    if (error || !row) {
      await editPaged<Item>(qc, openKey, (items) => items.filter((x) => x.id !== temp.id));
      setText(v);
      toast.err("Couldn't add that.");
    } else {
      await editPaged<Item>(qc, openKey, (items) => items.map((x) => (x.id === temp.id ? row : x)));
    }
    refresh();
  };

  const toggle = async (item: Item) => {
    if (item.pending) return;
    const nowDone = !item.done_at;
    if (nowDone) {
      feedback("success", "win");
      setBurst((b) => b + 1);
    } else {
      feedback("tap");
    }
    const moved: Item = nowDone
      ? { ...item, done_at: new Date().toISOString(), done_by: me.id }
      : { ...item, done_at: null, done_by: null };
    const [from, to] = nowDone ? [openKey, doneKey] : [doneKey, openKey];
    await qc.cancelQueries({ queryKey: countKey });
    const prevCount = qc.getQueryData<number>(countKey);
    const prevFrom = await editPaged<Item>(qc, from, (items) =>
      items.filter((x) => x.id !== item.id),
    );
    const prevTo = await editPaged<Item>(qc, to, (items, i) =>
      i === 0 ? [moved, ...items].sort(nowDone ? byDone : byCreated) : items,
    );
    if (!prevTo) ensure(to, moved);
    qc.setQueryData<number>(countKey, Math.max(0, (prevCount ?? 0) + (nowDone ? 1 : -1)));
    const { error } = await supabaseBrowser()
      .from("bucket_items")
      .update({ done_at: moved.done_at, done_by: moved.done_by })
      .eq("id", item.id);
    if (error) {
      qc.setQueryData(from, prevFrom);
      qc.setQueryData(to, prevTo);
      qc.setQueryData(countKey, prevCount);
      toast.err("Couldn't update that.");
    }
    refresh();
  };

  const remove = async (item: Item) => {
    if (item.pending) return;
    const key = item.done_at ? doneKey : openKey;
    const prev = await editPaged<Item>(qc, key, (items) => items.filter((x) => x.id !== item.id));
    const prevCount = qc.getQueryData<number>(countKey);
    if (item.done_at) qc.setQueryData<number>(countKey, Math.max(0, (prevCount ?? 0) - 1));
    const { error } = await supabaseBrowser().from("bucket_items").delete().eq("id", item.id);
    if (error) {
      qc.setQueryData(key, prev);
      qc.setQueryData(countKey, prevCount);
      toast.err("Couldn't remove that.");
    }
    refresh();
  };

  const open = flatPaged(openQ.data);
  const done = flatPaged(doneQ.data);
  const catOf = (c: string) => CATS.find((x) => x.key === c) ?? CATS[0];
  const loading = openQ.isPending || doneQ.isPending;

  const row = (i: Item, isDone: boolean) => {
    const c = catOf(i.category);
    const labelId = `bucket-${i.id}`;
    return (
      <motion.li
        key={i.id}
        layout
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: i.pending ? 0.7 : 1, y: 0 }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.18 }}
        className="flex items-center gap-3 px-3 py-2"
        aria-busy={i.pending || undefined}
      >
        <DoneBox
          checked={isDone}
          labelledBy={labelId}
          disabled={i.pending}
          onToggle={() => void toggle(i)}
        />
        <span className="min-w-0 flex-1 py-1">
          <span
            id={labelId}
            className={cn(
              "block text-[15px] font-semibold break-words transition-colors",
              isDone && "text-muted line-through decoration-[1.5px]",
            )}
          >
            {i.text}
          </span>
          <span className="text-faint flex items-center gap-1 text-xs">
            <c.Icon size={12} weight="bold" aria-hidden />
            {c.label}
            <span aria-hidden>·</span>
            {isDone && i.done_at
              ? `Done ${new Date(i.done_at).toLocaleDateString([], { day: "numeric", month: "short" })}`
              : `Added by ${i.created_by === me.id ? "you" : partner.name}`}
          </span>
        </span>
        <IconButton
          label={`Remove ${i.text}`}
          dim={44}
          disabled={i.pending}
          onClick={() => void remove(i)}
          className="text-faint! hover:text-danger!"
          style={{ borderColor: "transparent" }}
        >
          <Trash size={18} />
        </IconButton>
      </motion.li>
    );
  };

  return (
    <main className="screen an-screen relative flex max-w-[640px] flex-col gap-4">
      {burst > 0 && (
        <div key={burst} className="pointer-events-none fixed inset-0 z-50">
          <Confetti count={30} seed={burst} />
        </div>
      )}
      <PageBar title="Our list" back="/plans" />
      <p className="text-muted m-0 text-base">
        Everything you and {partner.name} want to do together.{" "}
        {doneCount > 0 && `${doneCount} done so far.`}
      </p>

      <form
        className="bg-s1 border-line rounded-card flex flex-col gap-2.5 border p-3"
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
            className="rounded-input bg-s2 text-text h-[52px] min-w-0 flex-1 border-0 px-3.5 text-base"
          />
          <Button type="submit" size="md" disabled={!text.trim()} aria-label="Add">
            <Plus size={20} weight="bold" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Kind">
          {CATS.map((c) => (
            <button
              key={c.key}
              type="button"
              role="radio"
              aria-checked={cat === c.key}
              onClick={() => setCat(c.key)}
              className={cn(
                "flex h-11 cursor-pointer items-center gap-1.5 rounded-full border-0 px-3.5 text-xs font-semibold",
                cat === c.key ? "bg-accent text-on-accent" : "bg-s2 text-muted",
              )}
            >
              <c.Icon size={14} weight="bold" aria-hidden />
              {c.label}
            </button>
          ))}
        </div>
      </form>

      {!loading && open.length === 0 && done.length === 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-faint text-sm">Need a start? Tap one:</div>
          <div className="flex flex-wrap gap-1.5">
            {IDEAS.map((idea) => (
              <button
                key={idea}
                type="button"
                onClick={() => void add(idea)}
                className="bg-s2 text-text hover:bg-s3 min-h-11 cursor-pointer rounded-full border-0 px-3 py-2 text-sm"
              >
                {idea}
              </button>
            ))}
          </div>
        </div>
      )}

      {(loading || open.length > 0) && (
        <ul
          className="divide-line rounded-card border-line bg-s1 m-0 flex list-none flex-col divide-y overflow-hidden border p-0"
          aria-label="To do"
        >
          <AnimatePresence initial={false}>{open.map((i) => row(i, false))}</AnimatePresence>
          {(openQ.isPending || openQ.isFetchingNextPage) && <SkeletonRows />}
        </ul>
      )}
      {openQ.hasNextPage && !openQ.isFetchingNextPage && (
        <Button
          variant="ghost"
          size="sm"
          className="self-center"
          onClick={() => void openQ.fetchNextPage()}
        >
          Load more
        </Button>
      )}

      {done.length > 0 && (
        <section aria-label="Done together" className="flex flex-col gap-2">
          <h2 className="text-muted m-0 text-sm font-semibold">Done together</h2>
          <ul className="divide-line rounded-card border-line m-0 flex list-none flex-col divide-y overflow-hidden border p-0">
            <AnimatePresence initial={false}>{done.map((i) => row(i, true))}</AnimatePresence>
            {doneQ.isFetchingNextPage && <SkeletonRows n={2} />}
          </ul>
          {doneQ.hasNextPage && !doneQ.isFetchingNextPage && (
            <Button
              variant="ghost"
              size="sm"
              className="self-center"
              onClick={() => void doneQ.fetchNextPage()}
            >
              Load more done
            </Button>
          )}
        </section>
      )}
    </main>
  );
}

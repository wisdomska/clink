"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "@/components/ui/link";
import { useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  MagnifyingGlass,
  X,
  ChatCircle,
  EnvelopeSimple,
  CalendarBlank,
  Hourglass,
  ListChecks,
  CheckCircle,
} from "@phosphor-icons/react";
import { LoadingDots } from "@/components/ui/spinner";
import { cn } from "@/components/ui/cn";
import { useCouple } from "@/features/couple/context";
import { localParts } from "@/lib/time";
import { useSearchShortcut } from "./search-shortcut";
import { PageBar } from "@/components/clink/page-bar";

export interface SearchResults {
  q: string;
  messages: Array<{ id: string; mine: boolean; snippet: string; at: string }>;
  letters: Array<{ id: string; condition: string; snippet: string; mine: boolean; at: string }>;
  plans: Array<
    | {
        kind: "date";
        id: string;
        kitId: string;
        title: string;
        status: string;
        at: string;
      }
    | { kind: "countdown"; id: string; title: string; subtitle: string | null; at: string }
  >;
  list: Array<{ id: string; text: string; category: string; done: boolean }>;
}

type Filter = "all" | "messages" | "letters" | "plans" | "list";

function Highlight({ text, q }: { text: string; q: string }) {
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0 || !q) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-accent/25 text-text rounded-flap px-0.5">
        {text.slice(i, i + q.length)}
      </mark>
      {text.slice(i + q.length)}
    </>
  );
}

function shortDate(iso: string, tz: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: tz,
  }).format(new Date(iso));
}

async function fetchResults(term: string): Promise<SearchResults> {
  const r = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message ?? "Search failed.");
  return r.json();
}

/** One search box for messages, letters you can read, plans and your list. */
export function SearchScreen() {
  const { me, partner } = useCouple();
  const router = useRouter();
  const params = useSearchParams();
  const [text, setText] = useState(() => params.get("q") ?? "");
  const [term, setTerm] = useState(() => (params.get("q") ?? "").trim());
  const [filter, setFilter] = useState<Filter>("all");
  const input = useRef<HTMLInputElement>(null);

  // "/" focuses the box here instead of navigating.
  const focusBox = useCallback(() => input.current?.focus(), []);
  useSearchShortcut(focusBox);

  // Debounce typing, and keep the term in the URL so back returns to the results.
  useEffect(() => {
    const t = setTimeout(() => {
      const next = text.trim();
      setTerm(next);
      router.replace(next ? `/search?q=${encodeURIComponent(next)}` : "/search", {
        scroll: false,
      });
    }, 250);
    return () => clearTimeout(t);
  }, [text, router]);

  const ready = term.length >= 2;
  const { data, isFetching, isError, error } = useQuery({
    queryKey: ["search", term],
    enabled: ready,
    queryFn: () => fetchResults(term),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
  const res = ready ? data : undefined;
  const counts = {
    messages: res?.messages.length ?? 0,
    letters: res?.letters.length ?? 0,
    plans: res?.plans.length ?? 0,
    list: res?.list.length ?? 0,
  };
  const total = counts.messages + counts.letters + counts.plans + counts.list;
  // A filter with nothing in it (after a new search) falls back to everything.
  const active: Filter = filter !== "all" && counts[filter] === 0 ? "all" : filter;
  const show = (f: Exclude<Filter, "all">) => (active === "all" || active === f) && counts[f] > 0;
  const dayHref = (iso: string) => `/calendar?d=${localParts(new Date(iso), me.timezone).dateKey}`;
  const q = res?.q ?? term;

  return (
    <main className="screen an-screen mx-auto flex w-full max-w-[760px] flex-col gap-4">
      <PageBar title="Search" />
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          setTerm(text.trim());
        }}
        className="rounded-input border-line bg-s2 focus-within:border-accent flex h-[52px] items-center gap-2 border pr-1.5 pl-4"
      >
        <MagnifyingGlass size={20} className="text-muted flex-none" aria-hidden />
        <input
          ref={input}
          autoFocus
          type="search"
          enterKeyHint="search"
          aria-label="Search Clink"
          placeholder="Messages, letters, plans, your list"
          value={text}
          maxLength={100}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && text && (e.preventDefault(), setText(""))}
          className="text-text min-w-0 flex-1 bg-transparent text-base outline-none focus-visible:shadow-none [&::-webkit-search-cancel-button]:hidden"
        />
        {isFetching && <LoadingDots className="text-accent" />}
        {text && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setText("");
              input.current?.focus();
            }}
            className="text-muted hover:text-text flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-full border-0 bg-transparent"
          >
            <X size={18} />
          </button>
        )}
      </form>

      {ready && res && total > 0 && (
        <div
          className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1"
          role="group"
          aria-label="Show"
        >
          {(
            [
              ["all", "All", total],
              ["messages", "Messages", counts.messages],
              ["letters", "Letters", counts.letters],
              ["plans", "Plans", counts.plans],
              ["list", "Our list", counts.list],
            ] as const
          )
            .filter(([k, , n]) => k === "all" || n > 0)
            .map(([k, label, n]) => (
              <button
                key={k}
                type="button"
                aria-pressed={active === k}
                onClick={() => setFilter(k)}
                className={cn(
                  "flex h-11 flex-none cursor-pointer items-center gap-1.5 rounded-full border px-4 text-sm font-semibold",
                  active === k
                    ? "bg-accent text-on-accent border-transparent"
                    : "border-line bg-s1 text-muted hover:text-text",
                )}
              >
                {label}
                <span className="mono text-xs opacity-80">{n}</span>
              </button>
            ))}
        </div>
      )}

      <div role="status" aria-live="polite" className="text-muted text-sm">
        {!ready
          ? text.trim().length === 1
            ? "Keep typing."
            : ""
          : isError
            ? (error as Error).message
            : res
              ? total
                ? `${total} result${total === 1 ? "" : "s"} for "${q}"`
                : `Nothing for "${q}". Try another word.`
              : ""}
      </div>

      {!ready && (
        <div className="rounded-card border-line bg-s1 flex flex-col gap-3 border p-5">
          <p className="text-text m-0 text-base font-semibold">Find anything you two have shared</p>
          <ul className="text-muted m-0 flex list-none flex-col gap-2 p-0 text-sm">
            <li className="flex items-center gap-2">
              <ChatCircle size={18} aria-hidden /> Messages in your chat
            </li>
            <li className="flex items-center gap-2">
              <EnvelopeSimple size={18} aria-hidden /> Letters you wrote or have opened
            </li>
            <li className="flex items-center gap-2">
              <CalendarBlank size={18} aria-hidden /> Dates and countdowns
            </li>
            <li className="flex items-center gap-2">
              <ListChecks size={18} aria-hidden /> Things on your list
            </li>
          </ul>
          <p className="text-faint m-0 hidden text-xs [@media(pointer:fine)]:block">
            Tip: press / in Chat or Plans to jump straight here.
          </p>
        </div>
      )}

      {ready && !res && isFetching && (
        <div className="flex flex-col gap-2" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="an-skel bg-s2 rounded-input h-16"
              style={{ animationDelay: `${i * 90}ms` }}
            />
          ))}
        </div>
      )}

      {res && show("messages") && (
        <Group title="Messages" count={counts.messages} more={counts.messages === 20}>
          {res.messages.map((m) => (
            <Row
              key={m.id}
              href={`/chat?m=${m.id}`}
              icon={<ChatCircle size={20} aria-hidden />}
              meta={`${m.mine ? "You" : partner.name} · ${shortDate(m.at, me.timezone)}`}
            >
              <Highlight text={m.snippet} q={q} />
            </Row>
          ))}
        </Group>
      )}

      {res && show("letters") && (
        <Group title="Letters" count={counts.letters}>
          {res.letters.map((l) => (
            <Row
              key={l.id}
              href={`/keep/letters/${l.id}`}
              icon={<EnvelopeSimple size={20} aria-hidden />}
              meta={`${l.mine ? "From you" : `From ${partner.name}`} · ${shortDate(l.at, me.timezone)}`}
              title={<Highlight text={l.condition} q={q} />}
            >
              <Highlight text={l.snippet} q={q} />
            </Row>
          ))}
        </Group>
      )}

      {res && show("plans") && (
        <Group title="Plans and dates" count={counts.plans}>
          {res.plans.map((p) => (
            <Row
              key={`${p.kind}-${p.id}`}
              href={dayHref(p.at)}
              icon={
                p.kind === "date" ? (
                  <CalendarBlank size={20} aria-hidden />
                ) : (
                  <Hourglass size={20} aria-hidden />
                )
              }
              meta={`${p.kind === "date" ? (p.status === "completed" ? "Date, done" : "Date") : "Countdown"} · ${shortDate(p.at, me.timezone)}`}
            >
              <Highlight text={p.title} q={q} />
              {p.kind === "countdown" && p.subtitle ? (
                <span className="text-muted">
                  {" "}
                  · <Highlight text={p.subtitle} q={q} />
                </span>
              ) : null}
            </Row>
          ))}
        </Group>
      )}

      {res && show("list") && (
        <Group title="Our list" count={counts.list}>
          {res.list.map((b) => (
            <Row
              key={b.id}
              href="/plans/list"
              icon={
                b.done ? (
                  <CheckCircle size={20} weight="fill" className="text-accent" aria-hidden />
                ) : (
                  <ListChecks size={20} aria-hidden />
                )
              }
              meta={b.done ? "Done" : "On your list"}
            >
              <Highlight text={b.text} q={q} />
            </Row>
          ))}
        </Group>
      )}
    </main>
  );
}

function Group({
  title,
  count,
  more,
  children,
}: {
  title: string;
  count: number;
  more?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h2 className="m-0 text-lg font-bold">{title}</h2>
        <span className="mono text-faint text-xs">
          {count}
          {more ? "+" : ""}
        </span>
      </div>
      <ul className="rounded-card border-line bg-s1 divide-line m-0 flex list-none flex-col divide-y overflow-hidden border p-0">
        {children}
      </ul>
    </section>
  );
}

function Row({
  href,
  icon,
  meta,
  title,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  meta: string;
  title?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="hover:bg-s2 text-text hover:text-text flex min-h-14 items-start gap-3 px-4 py-3"
      >
        <span className="text-muted mt-0.5 flex-none">{icon}</span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          {title && <span className="truncate text-sm font-semibold">{title}</span>}
          <span className="line-clamp-2 text-sm [overflow-wrap:anywhere]">{children}</span>
          <span className="text-faint text-xs">{meta}</span>
        </span>
      </Link>
    </li>
  );
}

"use client";
import { useEffect, useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { Sheet } from "@/components/ui/sheet";
import { supabaseBrowser } from "@/lib/supabase/client";
import { LoadingDots } from "@/components/ui/spinner";

interface Hit {
  id: string;
  sender_id: string;
  body: string | null;
  sent_at: string;
}

function Highlight({ text, q }: { text: string; q: string }) {
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0 || !q) return <>{text}</>;
  const start = Math.max(0, i - 30);
  return (
    <>
      {start > 0 && "..."}
      {text.slice(start, i)}
      <mark className="bg-accent/30 text-text rounded px-0.5">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length, i + q.length + 80)}
    </>
  );
}

/** Search the whole conversation (WhatsApp style); tap a result to jump to it. */
export function ChatSearch({
  open,
  onOpenChange,
  meId,
  partnerName,
  onJump,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  meId: string;
  partnerName: string;
  onJump: (hit: Hit) => void;
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const t = setTimeout(async () => {
      setBusy(true);
      const { data } = await supabaseBrowser()
        .from("messages")
        .select("id, sender_id, body, sent_at")
        .eq("type", "text")
        .is("removed_at", null)
        .ilike("body", `%${term.replace(/[%_]/g, (c) => `\\${c}`)}%`)
        .order("sent_at", { ascending: false })
        .limit(50);
      setHits(data ?? []);
      setBusy(false);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const term = q.trim();
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Search messages" handle>
      <div className="rounded-input bg-s2 flex h-[52px] items-center gap-2 px-3.5">
        <MagnifyingGlass size={18} className="text-muted" aria-hidden />
        <input
          autoFocus
          aria-label="Search messages"
          placeholder="Search your messages"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="text-text min-w-0 flex-1 bg-transparent text-base outline-none focus-visible:shadow-none"
        />
        {busy && <LoadingDots className="text-accent" />}
      </div>
      {term.length >= 2 && hits && (
        <div className="text-faint text-xs" role="status">
          {hits.length
            ? `${hits.length}${hits.length === 50 ? "+" : ""} found`
            : "Nothing yet. Try another word."}
        </div>
      )}
      <ul className="m-0 flex list-none flex-col p-0">
        {term.length >= 2 &&
          (hits ?? []).map((h) => (
            <li key={h.id}>
              <button
                type="button"
                onClick={() => onJump(h)}
                className="press hover:bg-s2 border-line flex w-full cursor-pointer flex-col items-start gap-0.5 border-0 border-b bg-transparent px-1 py-2.5 text-left"
              >
                <span className="text-faint text-xs">
                  {h.sender_id === meId ? "You" : partnerName} ·{" "}
                  {new Date(h.sent_at).toLocaleDateString([], {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                <span className="text-text line-clamp-2 text-sm">
                  <Highlight text={h.body ?? ""} q={term} />
                </span>
              </button>
            </li>
          ))}
      </ul>
    </Sheet>
  );
}

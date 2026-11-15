"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUp, ArrowDown, Plus } from "@phosphor-icons/react";
import { Display } from "@/components/ui/heading";
import { Button, IconButton } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { toast } from "@/components/ui/toast";
import { adminFetch } from "./fetch";
import { usePrompt } from "./ui";

type Table = "dares" | "deck_cards" | "date_kits" | "challenge_templates" | "stickers" | "decks";
type Row = Record<string, unknown> & { id: string | number; enabled: boolean; sort: number };

const TABS: Array<{ value: Table; label: string }> = [
  { value: "deck_cards", label: "Deck cards" },
  { value: "dares", label: "Dares" },
  { value: "date_kits", label: "Date kits" },
  { value: "challenge_templates", label: "Challenges" },
  { value: "stickers", label: "Stickers" },
];
const TIERS = ["Flirty", "Steamy", "Spicy", "Unhinged"];
const title = (r: Row) => String(r.text ?? r.title ?? r.label ?? r.id);

/** Content library: create, edit, reorder, enable or disable. */
export function AdminContent() {
  const prompt = usePrompt();
  const qc = useQueryClient();
  const [table, setTable] = useState<Table>("deck_cards");
  const [filter, setFilter] = useState("Flirty");
  const { data: decks } = useQuery({
    queryKey: ["admin-content", "decks"],
    queryFn: () => adminFetch<{ rows: Row[] }>("/api/admin/content/decks"),
  });
  const deckId = decks?.rows.find((d) => d.tier === filter)?.id as string | undefined;
  const filterParam = table === "dares" ? filter : table === "deck_cards" ? deckId : undefined;
  const key = ["admin-content", table, filterParam];
  const { data } = useQuery({
    queryKey: key,
    enabled: table !== "deck_cards" || Boolean(deckId),
    queryFn: () =>
      adminFetch<{ rows: Row[] }>(
        `/api/admin/content/${table}${filterParam ? `?filter=${filterParam}` : ""}`,
      ),
  });
  const rows = data?.rows ?? [];

  async function patch(r: Row, body: Record<string, unknown>) {
    await adminFetch(`/api/admin/content/${table}/${r.id}`, { method: "PATCH", body });
    void qc.invalidateQueries({ queryKey: key });
  }
  async function move(i: number, dir: -1 | 1) {
    const a = rows[i]!;
    const b = rows[i + dir];
    if (!b) return;
    await Promise.all([patch(a, { sort: b.sort }), patch(b, { sort: a.sort })]);
  }
  async function add() {
    const text = await prompt.ask({
      title: "Add item",
      label:
        table === "stickers"
          ? "Sticker label (10 characters max)"
          : table === "date_kits" || table === "challenge_templates"
            ? "Title"
            : "Text",
    });
    if (!text) return;
    const nextSort = (rows[rows.length - 1]?.sort ?? 0) + 1;
    const slug = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);
    const body: Record<string, unknown> =
      table === "deck_cards"
        ? { deck_id: deckId, text, sort: nextSort }
        : table === "dares"
          ? { tier: filter, text, sort: nextSort, needs_media: false }
          : table === "stickers"
            ? { id: slug, label: text.slice(0, 10), sort: nextSort }
            : table === "date_kits"
              ? {
                  slug,
                  title: text,
                  minutes: 60,
                  blurb: "A new date night.",
                  steps: ["Set the scene."],
                  prompts: [],
                  sort: nextSort,
                  enabled: false,
                }
              : {
                  slug,
                  title: text,
                  days: 7,
                  blurb: "A new challenge.",
                  daily_prompt: "Do one small thing for each other today.",
                  sort: nextSort,
                  enabled: false,
                };
    try {
      await adminFetch(`/api/admin/content/${table}`, { body });
      toast(
        table === "date_kits" || table === "challenge_templates"
          ? "Added and switched off. Enable it when it's ready."
          : "Added to the end of the list.",
      );
      void qc.invalidateQueries({ queryKey: key });
    } catch (e) {
      toast.err(e instanceof Error ? e.message : "Couldn't add that. Try again.");
    }
  }

  return (
    <div className="an-screen flex flex-col gap-5">
      <Display size={36}>Content library</Display>
      <div className="no-scrollbar overflow-x-auto">
        <div className="max-w-[760px] min-w-[620px]">
          <Segmented label="Content type" value={table} onChange={setTable} options={TABS} />
        </div>
      </div>
      {(table === "dares" || table === "deck_cards") && (
        <div className="flex gap-2" role="radiogroup" aria-label="Tier">
          {TIERS.map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={filter === t}
              onClick={() => setFilter(t)}
              className="press h-10 cursor-pointer rounded-full border px-4 text-sm font-medium"
              style={{
                borderColor: filter === t ? "var(--accent)" : "var(--line)",
                background: filter === t ? "var(--accent)" : "transparent",
                color: filter === t ? "var(--on-accent)" : "var(--text)",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="text-muted text-sm">
          {rows.length} items, {rows.filter((r) => r.enabled).length} live
        </div>
        <Button size="sm" onClick={add}>
          <Plus size={16} aria-hidden /> Add item
        </Button>
      </div>
      <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
        {rows.map((r, i) => (
          <li
            key={String(r.id)}
            className="rounded-input border-line bg-s1 flex items-center gap-2 border px-3 py-2"
            style={{ opacity: r.enabled ? 1 : 0.55 }}
          >
            <span className="mono text-faint w-8 text-xs">{i + 1}</span>
            <button
              type="button"
              className="text-text flex-1 cursor-text bg-transparent text-left text-sm"
              onClick={async () => {
                const field = "text" in r ? "text" : "title" in r ? "title" : "label";
                const v = await prompt.ask({ title: "Edit item", label: "Text", value: title(r) });
                if (v && v !== title(r)) {
                  try {
                    await patch(r, { [field]: v });
                    toast("Saved.");
                  } catch (e) {
                    toast.err(e instanceof Error ? e.message : "Couldn't save that. Try again.");
                  }
                }
              }}
            >
              {title(r)}
            </button>
            <IconButton label="Move up" dim={36} onClick={() => move(i, -1)} disabled={i === 0}>
              <ArrowUp size={16} />
            </IconButton>
            <IconButton
              label="Move down"
              dim={36}
              onClick={() => move(i, 1)}
              disabled={i === rows.length - 1}
            >
              <ArrowDown size={16} />
            </IconButton>
            <Button
              size="xs"
              variant={r.enabled ? "ghost" : "secondary"}
              onClick={() => patch(r, { enabled: !r.enabled })}
            >
              {r.enabled ? "Disable" : "Enable"}
            </Button>
          </li>
        ))}
      </ol>
      {prompt.dialog}
    </div>
  );
}

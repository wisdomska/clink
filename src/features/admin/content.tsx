"use client";
import { Reorder, useDragControls } from "motion/react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUp, ArrowDown, Plus, DotsSixVertical } from "@phosphor-icons/react";
import { Display } from "@/components/ui/heading";
import { Button, IconButton } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { toast } from "@/components/ui/toast";
import { Pagination } from "@/components/ui/pagination";
import { adminFetch } from "./fetch";
import { usePrompt } from "./ui";
import { AdminPage, useListParams } from "./list";
import { cn } from "@/components/ui/cn";

type Table = "dares" | "deck_cards" | "date_kits" | "challenge_templates" | "stickers" | "decks";
type Row = Record<string, unknown> & { id: string | number; enabled: boolean; sort: number };
interface Page {
  rows: Row[];
  total: number;
  maxSort: number;
}

const TABS: Array<{ value: Table; label: string }> = [
  { value: "deck_cards", label: "Deck cards" },
  { value: "dares", label: "Dares" },
  { value: "date_kits", label: "Date kits" },
  { value: "challenge_templates", label: "Challenges" },
  { value: "stickers", label: "Stickers" },
];
const TIERS = ["Flirty", "Steamy", "Spicy", "Unhinged"];
const title = (r: Row) => String(r.text ?? r.title ?? r.label ?? r.id);

/**
 * Content library: create, edit, reorder, enable or disable. Long lists come a
 * page at a time; the content type, tier, page and page size live in the URL.
 * Reordering (drag or arrows) works within the current page.
 */
export function AdminContent() {
  const prompt = usePrompt();
  const qc = useQueryClient();
  const list = useListParams<"sort">({ sort: "sort", dir: "asc" });
  const table = (
    TABS.some((t) => t.value === list.get("type")) ? list.get("type") : "deck_cards"
  ) as Table;
  const setTable = (v: Table) => list.set({ type: v === "deck_cards" ? null : v });
  const filter = TIERS.includes(list.get("tier")) ? list.get("tier") : "Flirty";
  const setFilter = (v: string) => list.set({ tier: v === "Flirty" ? null : v });
  const offset = (list.page - 1) * list.size;
  const { data: decks } = useQuery({
    queryKey: ["admin-content", "decks"],
    queryFn: () => adminFetch<{ rows: Row[] }>("/api/admin/content/decks"),
  });
  const deckId = decks?.rows.find((d) => d.tier === filter)?.id as string | undefined;
  const filterParam = table === "dares" ? filter : table === "deck_cards" ? deckId : undefined;
  const key = ["admin-content", table, filterParam, list.page, list.size];
  const { data } = useQuery({
    queryKey: key,
    enabled: table !== "deck_cards" || Boolean(deckId),
    queryFn: () =>
      adminFetch<Page>(
        `/api/admin/content/${table}?page=${list.page}&size=${list.size}${filterParam ? `&filter=${encodeURIComponent(filterParam)}` : ""}`,
      ),
    placeholderData: keepPreviousData,
  });
  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  /** Replace this page's rows in the cache, keeping the totals. */
  const setRows = (next: Row[]) =>
    qc.setQueryData<Page>(key, (prev) => ({
      total: prev?.total ?? next.length,
      maxSort: prev?.maxSort ?? next.length,
      rows: next,
    }));

  async function patch(r: Row, body: Record<string, unknown>) {
    await adminFetch(`/api/admin/content/${table}/${r.id}`, { method: "PATCH", body });
    void qc.invalidateQueries({ queryKey: key });
  }
  /** Reorder instantly on screen, then save this page's order (at its offset) in one request. */
  async function reorder(next: Row[]) {
    const prev = qc.getQueryData<Page>(key);
    setRows(next.map((r, i) => ({ ...r, sort: offset + i })));
    try {
      await adminFetch(`/api/admin/content/${table}/reorder`, {
        body: { ids: next.map((r) => r.id), offset, filter: filterParam },
      });
    } catch (e) {
      if (prev) qc.setQueryData(key, prev);
      toast.err(e instanceof Error ? e.message : "Couldn't save the new order. Try again.");
    }
  }
  /** After a drag, save whatever order is on screen. */
  function saveDragged() {
    const cur = qc.getQueryData<Page>(key)?.rows;
    if (cur) void reorder(cur);
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const next = rows.slice();
    [next[i], next[j]] = [next[j]!, next[i]!];
    void reorder(next);
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
    // After the last item in the whole list, not just this page.
    const nextSort = Math.max(data?.maxSort ?? -1, rows[rows.length - 1]?.sort ?? -1) + 1;
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
    <AdminPage>
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
              className={cn(
                "press h-9 cursor-pointer rounded-full border px-4 text-sm font-medium",
                filter === t
                  ? "border-line-strong bg-s3 text-text"
                  : "border-line text-muted hover:text-text bg-transparent",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="text-muted text-sm">
          {total > rows.length
            ? `${total} items, ${rows.filter((r) => r.enabled).length} of this page live`
            : `${rows.length} items, ${rows.filter((r) => r.enabled).length} live`}
        </div>
        <Button size="sm" onClick={add}>
          <Plus size={16} aria-hidden /> Add item
        </Button>
      </div>
      <Reorder.Group
        as="ol"
        axis="y"
        values={rows}
        onReorder={(next: Row[]) => setRows(next)}
        className={
          rows.length
            ? "rounded-card border-line bg-s1 divide-line m-0 flex list-none flex-col divide-y overflow-hidden border p-0"
            : "hidden"
        }
      >
        {rows.map((r, i) => (
          <ContentRow
            key={String(r.id)}
            row={r}
            index={i}
            position={offset + i + 1}
            count={rows.length}
            label={title(r)}
            onDrop={saveDragged}
            onMove={(dir) => move(i, dir)}
            onToggle={() => patch(r, { enabled: !r.enabled })}
            onEdit={async () => {
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
          />
        ))}
      </Reorder.Group>
      {data && total > 0 && (
        <Pagination
          page={list.page}
          size={list.size}
          total={total}
          noun="items"
          label="Content pages"
          onPage={(page, opts) => list.set({ page }, opts)}
          onSize={(size) => list.set({ size })}
        />
      )}
      {prompt.dialog}
    </AdminPage>
  );
}

/** One draggable row: grab the handle to drag, or use the arrows. */
function ContentRow({
  row,
  index,
  position,
  count,
  label,
  onDrop,
  onMove,
  onToggle,
  onEdit,
}: {
  row: Row;
  index: number;
  /** 1-based position in the whole list (page offset included). */
  position: number;
  count: number;
  label: string;
  onDrop: () => void;
  onMove: (dir: -1 | 1) => void;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={row}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDrop}
      className="bg-s1 relative flex items-center gap-2 px-3 py-1.5"
      whileDrag={{ scale: 1.01, boxShadow: "0 8px 24px rgba(0,0,0,.35)", zIndex: 2 }}
    >
      <button
        type="button"
        aria-label={`Drag to reorder: ${label}`}
        onPointerDown={(e) => controls.start(e)}
        className="text-faint hover:text-text flex h-9 w-6 flex-none cursor-grab touch-none items-center justify-center border-0 bg-transparent active:cursor-grabbing"
      >
        <DotsSixVertical size={18} weight="bold" aria-hidden />
      </button>
      <span className="mono text-faint w-7 text-xs tabular-nums">{position}</span>
      <button
        type="button"
        className={cn(
          "flex-1 cursor-text bg-transparent text-left text-sm",
          row.enabled ? "text-text" : "text-faint",
        )}
        onClick={onEdit}
      >
        {label}
      </button>
      <IconButton label="Move up" dim={36} onClick={() => onMove(-1)} disabled={index === 0}>
        <ArrowUp size={16} />
      </IconButton>
      <IconButton
        label="Move down"
        dim={36}
        onClick={() => onMove(1)}
        disabled={index === count - 1}
      >
        <ArrowDown size={16} />
      </IconButton>
      <Button size="xs" variant={row.enabled ? "ghost" : "secondary"} onClick={onToggle}>
        {row.enabled ? "Disable" : "Enable"}
      </Button>
    </Reorder.Item>
  );
}

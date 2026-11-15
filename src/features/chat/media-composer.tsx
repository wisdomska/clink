"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowClockwise,
  PaperPlaneRight,
  Plus,
  TextAa,
  Trash,
  X,
  MagicWand,
} from "@phosphor-icons/react";
import { cn } from "@/components/ui/cn";
import { feedback } from "@/lib/feedback";
import { MAX_PER_SEND } from "@/lib/media-rules";

/** Instagram-style looks, all plain CSS/canvas filters. */
const FILTERS = [
  { key: "none", label: "Original", css: "none" },
  { key: "warm", label: "Warm", css: "sepia(.25) saturate(1.3) contrast(1.05) brightness(1.04)" },
  { key: "vivid", label: "Vivid", css: "saturate(1.6) contrast(1.12)" },
  { key: "cool", label: "Cool", css: "hue-rotate(-12deg) saturate(1.1) brightness(1.03)" },
  { key: "fade", label: "Fade", css: "contrast(.86) brightness(1.08) saturate(.8)" },
  { key: "mono", label: "Mono", css: "grayscale(1) contrast(1.1)" },
  { key: "noir", label: "Noir", css: "grayscale(1) contrast(1.45) brightness(.92)" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];

const TEXT_COLOURS = ["#FFFFFF", "#111111", "#FF4F7B", "#FFC857", "#B9A4FF"];

interface Item {
  id: string;
  file: File;
  url: string;
  video: boolean;
  rotate: 0 | 90 | 180 | 270;
  filter: FilterKey;
  text: string;
  textColour: string;
  /** Text centre as a fraction of the image (0..1). */
  tx: number;
  ty: number;
}

const toItem = (f: File): Item => ({
  id: Math.random().toString(36).slice(2),
  file: f,
  url: URL.createObjectURL(f),
  video: f.type.startsWith("video"),
  rotate: 0,
  filter: "none",
  text: "",
  textColour: TEXT_COLOURS[0]!,
  tx: 0.5,
  ty: 0.5,
});

const edited = (it: Item) => it.rotate !== 0 || it.filter !== "none" || it.text.trim() !== "";

/** Bakes rotation, filter and text into a new JPEG. Videos pass through. */
async function render(it: Item): Promise<File> {
  if (it.video || !edited(it)) return it.file;
  const bmp = await createImageBitmap(it.file);
  const side = it.rotate % 180 !== 0;
  const w = side ? bmp.height : bmp.width;
  const h = side ? bmp.width : bmp.height;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.filter = FILTERS.find((f) => f.key === it.filter)!.css;
  ctx.translate(w / 2, h / 2);
  ctx.rotate((it.rotate * Math.PI) / 180);
  ctx.drawImage(bmp, -bmp.width / 2, -bmp.height / 2);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.filter = "none";
  if (it.text.trim()) {
    const size = Math.round(Math.min(w, h) * 0.075);
    ctx.font = `800 ${size}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const lines = it.text.trim().split("\n").slice(0, 4);
    lines.forEach((line, i) => {
      const y = it.ty * h + (i - (lines.length - 1) / 2) * size * 1.2;
      ctx.lineWidth = Math.max(2, size / 9);
      ctx.strokeStyle = it.textColour === "#111111" ? "rgba(255,255,255,.85)" : "rgba(0,0,0,.55)";
      ctx.strokeText(line, it.tx * w, y);
      ctx.fillStyle = it.textColour;
      ctx.fillText(line, it.tx * w, y);
    });
  }
  const blob = await new Promise<Blob>((res, rej) =>
    c.toBlob((b) => (b ? res(b) : rej(new Error("render"))), "image/jpeg", 0.9),
  );
  return new File([blob], it.file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}

/**
 * Pick, then polish before sending: a big preview, a strip to add or remove
 * shots, per-photo rotate, filters and a draggable text overlay, and one
 * caption for the lot.
 */
export function MediaComposer({
  files,
  partnerName,
  onCancel,
  onSend,
}: {
  files: File[];
  partnerName: string;
  onCancel: () => void;
  onSend: (files: File[], caption: string) => void;
}) {
  const [items, setItems] = useState<Item[]>(() => files.slice(0, MAX_PER_SEND).map(toItem));
  const [active, setActive] = useState(0);
  const [tool, setTool] = useState<"none" | "filter" | "text">("none");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const addRef = useRef<HTMLInputElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const it = items[Math.min(active, items.length - 1)];

  useEffect(() => () => items.forEach((x) => URL.revokeObjectURL(x.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = (p: Partial<Item>) =>
    setItems((list) => list.map((x, i) => (i === active ? { ...x, ...p } : x)));

  const filterCss = useMemo(
    () => FILTERS.find((f) => f.key === it?.filter)?.css ?? "none",
    [it?.filter],
  );

  if (!it) return null;

  const dragText = (e: React.PointerEvent) => {
    const box = stage.current?.getBoundingClientRect();
    if (!box) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) =>
      patch({
        tx: Math.min(0.95, Math.max(0.05, (ev.clientX - box.left) / box.width)),
        ty: Math.min(0.95, Math.max(0.05, (ev.clientY - box.top) / box.height)),
      });
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const toolBtn =
    "press flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-0 bg-black/45 text-white backdrop-blur";

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Edit before sending"
      className="fixed inset-0 z-[80] flex flex-col bg-black text-white"
      initial={{ opacity: 0.01, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 36 }}
    >
      <div className="flex items-center justify-between px-3 pt-[calc(env(safe-area-inset-top)+8px)] pb-2">
        <button type="button" aria-label="Cancel" className={toolBtn} onClick={onCancel}>
          <X size={22} />
        </button>
        {!it.video && (
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Rotate"
              className={toolBtn}
              onClick={() => {
                feedback("tap");
                patch({ rotate: ((it.rotate + 90) % 360) as Item["rotate"] });
              }}
            >
              <ArrowClockwise size={22} />
            </button>
            <button
              type="button"
              aria-label="Filters"
              aria-pressed={tool === "filter"}
              className={cn(toolBtn, tool === "filter" && "bg-accent text-on-accent")}
              onClick={() => setTool(tool === "filter" ? "none" : "filter")}
            >
              <MagicWand size={22} />
            </button>
            <button
              type="button"
              aria-label="Add text"
              aria-pressed={tool === "text"}
              className={cn(toolBtn, tool === "text" && "bg-accent text-on-accent")}
              onClick={() => setTool(tool === "text" ? "none" : "text")}
            >
              <TextAa size={22} />
            </button>
          </div>
        )}
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-3">
        <div ref={stage} className="relative max-h-full max-w-full">
          {it.video ? (
            <video
              src={it.url}
              controls
              playsInline
              className="max-h-[62dvh] max-w-full rounded-2xl"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={it.url}
              alt={`Photo ${active + 1} of ${items.length}`}
              className="max-h-[62dvh] max-w-full rounded-2xl object-contain transition-[filter,transform] duration-300"
              style={{ filter: filterCss, transform: `rotate(${it.rotate}deg)` }}
            />
          )}
          {it.text.trim() && !it.video && (
            <div
              onPointerDown={dragText}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none px-2 text-center text-[26px] leading-tight font-extrabold whitespace-pre select-none"
              style={{
                left: `${it.tx * 100}%`,
                top: `${it.ty * 100}%`,
                color: it.textColour,
                textShadow:
                  it.textColour === "#111111"
                    ? "0 0 6px rgba(255,255,255,.8)"
                    : "0 2px 8px rgba(0,0,0,.6)",
              }}
            >
              {it.text}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {tool === "filter" && !it.video && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="no-scrollbar flex gap-2 overflow-x-auto px-3 pt-3"
            role="radiogroup"
            aria-label="Filter"
          >
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                role="radio"
                aria-checked={it.filter === f.key}
                onClick={() => {
                  feedback("select");
                  patch({ filter: f.key });
                }}
                className="flex flex-none cursor-pointer flex-col items-center gap-1 border-0 bg-transparent text-xs text-white/80"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={it.url}
                  alt=""
                  className={cn(
                    "h-14 w-14 rounded-xl object-cover transition-transform",
                    it.filter === f.key
                      ? "scale-105 outline-2 outline-offset-2 outline-[var(--accent)] outline-solid"
                      : "",
                  )}
                  style={{ filter: f.css }}
                />
                {f.label}
              </button>
            ))}
          </motion.div>
        )}
        {tool === "text" && !it.video && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex flex-col gap-2 px-3 pt-3"
          >
            <textarea
              aria-label="Text on photo"
              autoFocus
              rows={1}
              maxLength={80}
              value={it.text}
              onChange={(e) => patch({ text: e.target.value })}
              placeholder="Say it on the photo. Drag to move."
              className="w-full resize-none rounded-2xl border-0 bg-white/10 px-4 py-3 text-base text-white outline-none placeholder:text-white/50 focus-visible:shadow-none"
            />
            <div className="flex gap-2" role="radiogroup" aria-label="Text colour">
              {TEXT_COLOURS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={it.textColour === c}
                  aria-label={`Colour ${c}`}
                  onClick={() => patch({ textColour: c })}
                  className="h-8 w-8 cursor-pointer rounded-full border-0 transition-transform"
                  style={{
                    background: c,
                    transform: it.textColour === c ? "scale(1.2)" : undefined,
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto px-3 pt-3">
        {items.map((x, i) => (
          <div key={x.id} className="relative flex-none">
            <button
              type="button"
              aria-label={`Show ${x.video ? "video" : "photo"} ${i + 1}`}
              aria-current={i === active}
              onClick={() => setActive(i)}
              className={cn(
                "block h-14 w-14 cursor-pointer overflow-hidden rounded-xl border-0 p-0 transition-transform",
                i === active
                  ? "scale-105 outline-2 outline-offset-2 outline-[var(--accent)] outline-solid"
                  : "opacity-70",
              )}
            >
              {x.video ? (
                <video src={x.url} muted className="h-full w-full object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={x.url}
                  alt=""
                  className="h-full w-full object-cover"
                  style={{
                    filter: FILTERS.find((f) => f.key === x.filter)!.css,
                    transform: `rotate(${x.rotate}deg)`,
                  }}
                />
              )}
            </button>
            {items.length > 1 && i === active && (
              <button
                type="button"
                aria-label="Remove this one"
                onClick={() => {
                  URL.revokeObjectURL(x.url);
                  setItems((l) => l.filter((y) => y.id !== x.id));
                  setActive((a) => Math.max(0, a - (a >= items.length - 1 ? 1 : 0)));
                }}
                className="bg-danger absolute -top-2 -right-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border-0 text-white"
              >
                <Trash size={12} weight="bold" />
              </button>
            )}
          </div>
        ))}
        {items.length < MAX_PER_SEND && (
          <button
            type="button"
            aria-label="Add more"
            onClick={() => addRef.current?.click()}
            className="flex h-14 w-14 flex-none cursor-pointer items-center justify-center rounded-xl border border-dashed border-white/30 bg-transparent text-white/80"
          >
            <Plus size={22} />
          </button>
        )}
        <input
          ref={addRef}
          type="file"
          accept="image/*,video/*"
          multiple
          hidden
          data-testid="composer-add"
          onChange={(e) => {
            const more = Array.from(e.target.files ?? []).map(toItem);
            setItems((l) => [...l, ...more].slice(0, MAX_PER_SEND));
            e.target.value = "";
          }}
        />
      </div>

      <form
        className="flex items-center gap-2 px-3 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)]"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          feedback("send", "send");
          try {
            const out = await Promise.all(items.map(render));
            onSend(out, caption.trim());
          } finally {
            setBusy(false);
          }
        }}
      >
        <input
          aria-label="Add a caption"
          placeholder="Add a caption"
          maxLength={1000}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="h-12 min-w-0 flex-1 rounded-full border-0 bg-white/10 px-4 text-base text-white outline-none placeholder:text-white/50 focus-visible:shadow-none"
        />
        <button
          type="submit"
          aria-label={`Send to ${partnerName}`}
          className="press bg-accent text-on-accent flex h-12 min-w-12 cursor-pointer items-center justify-center gap-1.5 rounded-full border-0 px-4 font-bold"
        >
          {items.length > 1 && <span className="mono text-sm">{items.length}</span>}
          <PaperPlaneRight size={20} weight="fill" />
        </button>
      </form>
    </motion.div>
  );
}

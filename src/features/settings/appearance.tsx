"use client";
import { Check } from "@phosphor-icons/react";
import { cn } from "@/components/ui/cn";
import { feedback } from "@/lib/feedback";
import { ACCENTS, setAppearance, useAppearance } from "@/lib/appearance";

/** Make Clink yours on this device: accent colour, chat text size, bubble shape. */
export function AppearanceCard() {
  const a = useAppearance();
  const seg = (on: boolean) =>
    cn(
      "h-10 flex-1 cursor-pointer rounded-full border-0 text-sm font-semibold transition-colors",
      on ? "bg-accent text-on-accent" : "bg-transparent text-muted",
    );
  return (
    <section
      aria-labelledby="appearance-h"
      className="rounded-card border-line bg-s1 flex flex-col gap-4 border p-4"
    >
      <h2 id="appearance-h" className="m-0 text-lg font-bold">
        Appearance
      </h2>
      <div className="flex flex-col gap-2">
        <span className="text-muted text-sm font-medium">Accent colour</span>
        <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Accent colour">
          {ACCENTS.map(([hex, label]) => {
            const on = a.accent.toUpperCase() === hex;
            return (
              <button
                key={hex}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={label}
                onClick={() => {
                  feedback("select");
                  setAppearance({ accent: hex });
                }}
                className={cn(
                  "flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-0 p-0 transition-shadow",
                  on && "ring-text ring-offset-s1 ring-2 ring-offset-2",
                )}
                style={{ background: hex }}
              >
                {on && <Check size={18} weight="bold" className="text-black/70" aria-hidden />}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-muted text-sm font-medium">Chat text size</span>
        <div className="bg-s2 flex rounded-full p-1" role="radiogroup" aria-label="Chat text size">
          {(
            [
              ["s", "Small"],
              ["m", "Medium"],
              ["l", "Large"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={a.text === k}
              onClick={() => setAppearance({ text: k })}
              className={seg(a.text === k)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-muted text-sm font-medium">Bubble shape</span>
        <div className="bg-s2 flex rounded-full p-1" role="radiogroup" aria-label="Bubble shape">
          {(
            [
              ["round", "Round"],
              ["soft", "Soft"],
              ["square", "Square"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={a.bubble === k}
              onClick={() => setAppearance({ bubble: k })}
              className={seg(a.bubble === k)}
            >
              {label}
            </button>
          ))}
        </div>
        {/* Live preview */}
        <div
          className="bg-app border-line rounded-input mt-1 flex flex-col gap-1.5 border p-3"
          aria-hidden
        >
          <span
            className="bg-s1 border-line w-fit border px-3 py-1.5 text-[length:var(--chat-text)]"
            style={{
              borderRadius: "var(--bubble-r) var(--bubble-r) var(--bubble-r) var(--bubble-j)",
            }}
          >
            miss you already
          </span>
          <span
            className="bg-accent text-on-accent w-fit self-end px-3 py-1.5 text-[length:var(--chat-text)]"
            style={{
              borderRadius: "var(--bubble-r) var(--bubble-r) var(--bubble-j) var(--bubble-r)",
            }}
          >
            call me tonight?
          </span>
        </div>
      </div>
    </section>
  );
}

"use client";
import type { CSSProperties, ReactNode } from "react";
import { Check } from "@phosphor-icons/react";
import { cn } from "@/components/ui/cn";
import { setAppearance, useAppearance } from "@/lib/appearance";
import {
  BUBBLE_GROUPS,
  CHAT_THEMES,
  CHAT_THEME_KEYS,
  WALLPAPERS,
  WALLPAPER_GROUPS,
  WALLPAPER_KEYS,
  bubbleVars,
  wallpaperStyle,
  type ChatTheme,
  type Wallpaper,
} from "../themes";

interface Look {
  theme: ChatTheme;
  wallpaper: Wallpaper;
  media: string | null;
  blur: boolean;
}

const OUT_R =
  "var(--bubble-r, 20px) var(--bubble-r, 20px) var(--bubble-j, 6px) var(--bubble-r, 20px)";
const IN_R =
  "var(--bubble-r, 20px) var(--bubble-r, 20px) var(--bubble-r, 20px) var(--bubble-j, 6px)";

function bubble(mine: boolean): CSSProperties {
  return mine
    ? {
        background: "var(--bubble-out)",
        color: "var(--bubble-out-fg)",
        border: "var(--bubble-out-border)",
        borderRadius: OUT_R,
      }
    : {
        background: "var(--bubble-in)",
        color: "var(--bubble-in-fg)",
        border: "var(--bubble-in-border)",
        borderRadius: IN_R,
      };
}

function wallStyle(look: Look, scale = 1): CSSProperties {
  if (look.wallpaper === "custom" && look.media)
    return {
      backgroundImage: `url(/api/media/${look.media}/view)`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      filter: look.blur ? "blur(8px) brightness(.7)" : "brightness(.75)",
      scale: look.blur ? "1.08" : undefined,
    };
  return {
    ...wallpaperStyle(look.wallpaper, scale),
    filter: look.blur && look.wallpaper !== "none" ? "blur(4px)" : undefined,
  };
}

/** Selected tiles: accent border plus a check badge. */
function Badge() {
  return (
    <span className="bg-accent text-on-accent absolute top-1.5 right-1.5 z-[1] flex h-5 w-5 items-center justify-center rounded-full">
      <Check size={12} weight="bold" aria-hidden />
    </span>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = `look-${title.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div role="group" aria-labelledby={id} className="flex flex-col gap-2">
      <span id={id} className="text-faint text-xs font-medium">
        {title}
      </span>
      {children}
    </div>
  );
}

/**
 * "Make it yours": a live preview of the conversation, then bubble themes and
 * wallpapers in groups. Theme and wallpaper are shared; shape is just this device.
 */
export function LookPicker({ look, onChange }: { look: Look; onChange: (next: Look) => void }) {
  const appearance = useAppearance();
  const tile = (on: boolean) =>
    cn(
      "rounded-input relative block w-full overflow-hidden border-2 transition-colors",
      on ? "border-accent" : "border-line",
    );
  const label =
    "flex cursor-pointer flex-col items-stretch gap-1.5 border-0 bg-transparent p-0 text-center text-xs font-medium text-[var(--text-muted)]";

  return (
    <>
      <div className="bg-s1 sticky top-0 z-[2] -mx-5 px-5 pt-1 pb-3">
        <div
          data-testid="look-preview"
          aria-label="Preview"
          role="img"
          className="rounded-card border-line bg-app relative h-36 overflow-hidden border"
          style={bubbleVars(look.theme)}
        >
          <div aria-hidden className="absolute inset-0" style={wallStyle(look)} />
          <div
            aria-hidden
            className="relative flex h-full flex-col justify-center gap-1.5 px-3.5 text-[15px] leading-[1.35]"
          >
            <span className="w-fit max-w-[75%] px-3.5 py-2" style={bubble(false)}>
              Dinner at 8?
            </span>
            <span className="w-fit max-w-[75%] self-end px-3.5 py-2" style={bubble(true)}>
              Only if I pick the wine
            </span>
          </div>
        </div>
      </div>

      <div className="text-muted text-sm font-semibold">Bubbles</div>
      <div role="radiogroup" aria-label="Chat theme" className="flex flex-col gap-4">
        {BUBBLE_GROUPS.map((g) => (
          <Section key={g} title={g}>
            <div className="grid grid-cols-4 gap-2.5">
              {CHAT_THEME_KEYS.filter((k) => CHAT_THEMES[k].group === g).map((k) => {
                const on = look.theme === k;
                return (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={CHAT_THEMES[k].label}
                    onClick={() => onChange({ ...look, theme: k })}
                    className={label}
                  >
                    <span
                      className={cn(
                        tile(on),
                        "bg-app flex h-16 flex-col justify-center gap-1 px-2",
                      )}
                      style={bubbleVars(k)}
                    >
                      {on && <Badge />}
                      <span className="h-3.5 w-9 self-start" style={bubble(false)} />
                      <span
                        className="self-end px-2 py-px text-[11px] leading-[14px] font-bold"
                        style={bubble(true)}
                      >
                        hey
                      </span>
                    </span>
                    <span className="truncate">{CHAT_THEMES[k].label}</span>
                  </button>
                );
              })}
            </div>
          </Section>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-muted text-sm font-semibold">Shape</span>
          <span className="text-faint text-xs">Just on this device.</span>
        </div>
        <div className="bg-s2 flex rounded-full p-1" role="radiogroup" aria-label="Bubble shape">
          {(
            [
              ["round", "Round"],
              ["soft", "Soft"],
              ["square", "Square"],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={appearance.bubble === k}
              onClick={() => setAppearance({ bubble: k })}
              className={cn(
                "h-11 cursor-pointer rounded-full border-0 px-3.5 text-sm font-semibold transition-colors",
                appearance.bubble === k ? "bg-accent text-on-accent" : "text-muted bg-transparent",
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="text-muted text-sm font-semibold">Wallpaper</div>
      <div role="radiogroup" aria-label="Chat wallpaper" className="flex flex-col gap-4">
        {WALLPAPER_GROUPS.map((g) => (
          <Section key={g} title={g}>
            <div className="grid grid-cols-4 gap-2.5">
              {WALLPAPER_KEYS.filter((k) => WALLPAPERS[k].group === g).map((k) => {
                const on = look.wallpaper === k;
                return (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={WALLPAPERS[k].label}
                    onClick={() => onChange({ ...look, wallpaper: k })}
                    className={label}
                  >
                    <span className={cn(tile(on), "bg-app h-20")}>
                      <span
                        aria-hidden
                        className="absolute inset-0"
                        style={wallpaperStyle(k, 0.5)}
                      />
                      {on && <Badge />}
                    </span>
                    <span className="truncate">{WALLPAPERS[k].label}</span>
                  </button>
                );
              })}
            </div>
          </Section>
        ))}
      </div>
    </>
  );
}

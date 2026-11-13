"use client";
import { cn } from "./cn";

/** Prototype switch: 48x28 pill, 22 px knob in --bg-app, accent when on. */
export function Toggle({
  checked,
  onChange,
  label,
  sub,
  disabled,
  last,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  sub?: string;
  disabled?: boolean;
  last?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "press flex min-h-14 w-full cursor-pointer items-center gap-3 bg-transparent px-4 py-2.5 text-left text-text disabled:opacity-50",
        !last && "border-b border-line",
      )}
    >
      <span className="flex-1">
        <span className="block text-base font-medium">{label}</span>
        {sub && <span className="block text-[13px] text-faint">{sub}</span>}
      </span>
      <span
        aria-hidden
        className="h-7 w-12 flex-none rounded-full p-[3px] transition-[background] duration-200"
        style={{ background: checked ? "var(--accent)" : "var(--surface-3)" }}
      >
        <span
          className="block h-[22px] w-[22px] rounded-full bg-app transition-transform duration-200"
          style={{ transform: `translateX(${checked ? 20 : 0}px)` }}
        />
      </span>
    </button>
  );
}

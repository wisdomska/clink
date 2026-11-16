"use client";
import { cn } from "./cn";

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  tone = "surface",
  label,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
  tone?: "surface" | "accent";
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "border-line flex flex-none rounded-full border p-1",
        tone === "surface" ? "bg-s1" : "bg-app",
      )}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cn(
              "press h-11 min-w-11 flex-1 cursor-pointer rounded-full border-0 px-3 text-sm",
              tone === "surface" ? "font-medium" : "font-semibold",
              on
                ? tone === "surface"
                  ? "bg-s3 text-text"
                  : "bg-accent text-on-accent"
                : "text-muted bg-transparent",
              !on && tone === "accent" && "text-text",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

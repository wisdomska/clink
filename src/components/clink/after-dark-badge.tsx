import { cn } from "@/components/ui/cn";

/**
 * The After Dark entry mark: "18+" on the After Dark romance gradient
 * (Rouge to Orchid) with a soft Ember glow. Reads as "the private, adults-only
 * space", never as a light/dark theme switch.
 */
export function AfterDarkBadge({ size = 44, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "display inline-flex flex-none items-center justify-center rounded-full font-extrabold tracking-[-0.02em] text-[#1a0a10] select-none",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.34),
        background: "var(--brand-gradient-romance)",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.12) inset, 0 6px 18px -4px var(--ember-55)",
      }}
    >
      18+
    </span>
  );
}

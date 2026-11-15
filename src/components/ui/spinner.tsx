import { cn } from "./cn";

/**
 * Standalone loader: a soft gradient arc that sweeps and breathes, rather than a
 * flat ring. Pure CSS (conic gradient + mask), so it costs nothing to render.
 */
export function Spinner({
  size = 24,
  label,
  className,
}: {
  size?: number;
  label?: string;
  className?: string;
}) {
  return (
    <span
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("ui-spinner inline-block flex-none", className)}
      style={{ width: size, height: size, ["--sp-w" as string]: `${Math.max(2, size / 9)}px` }}
    />
  );
}

/** Three dots that hop in sequence. Used inside buttons while they work. */
export function LoadingDots({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("ui-dots inline-flex items-center gap-[5px]", className)}>
      <i />
      <i />
      <i />
    </span>
  );
}

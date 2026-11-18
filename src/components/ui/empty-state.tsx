import type { ReactNode } from "react";
import { cn } from "./cn";

/**
 * The one empty state: a soft dashed card with art, a short title, one line
 * of why it's empty, and the action that fills it. Every list in Clink that
 * can be empty uses this, so empty never looks broken.
 */
export function EmptyState({
  art,
  title,
  children,
  actions,
  className,
  titleAs: Title = "h2",
}: {
  /** A /public/art name ("trophy") or any element (an icon, an illustration). */
  art?: string | ReactNode;
  title: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
  titleAs?: "h2" | "h3" | "div";
}) {
  return (
    <section
      className={cn(
        "rounded-card border-line flex flex-col items-start gap-3 border border-dashed p-5 sm:p-6",
        className,
      )}
    >
      {typeof art === "string" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/art/${art}.webp`} alt="" aria-hidden className="h-14 w-14 object-contain" />
      ) : (
        art
      )}
      <Title className="display m-0 text-[22px] leading-[1.1] text-pretty">{title}</Title>
      {children && (
        <div className="text-muted m-0 max-w-[52ch] text-base leading-normal text-pretty">
          {children}
        </div>
      )}
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </section>
  );
}

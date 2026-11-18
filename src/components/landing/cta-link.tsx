import Link from "@/components/ui/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/components/ui/cn";

/**
 * Landing calls to action. Pills, one line, with a tactile press, a Blush fill
 * that sweeps in on hover and an arrow that leans forward.
 */
export function CtaLink({
  href,
  children,
  variant = "primary",
  size = "lg",
  arrow = variant === "primary",
  className,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  size?: "lg" | "sm";
  arrow?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group press relative isolate inline-flex shrink-0 items-center justify-center gap-2 overflow-hidden rounded-full whitespace-nowrap",
        size === "lg" ? "h-14 px-7 text-base" : "h-11 px-5 text-sm",
        variant === "primary"
          ? "bg-accent text-on-accent hover:text-on-accent font-bold"
          : "border-line bg-s2 text-text hover:text-text hover:border-line-strong border font-medium",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 -z-10 origin-left scale-x-0 transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-x-100 motion-reduce:transition-none",
          variant === "primary" ? "bg-[var(--blush)]" : "bg-s3",
        )}
      />
      {children}
      {arrow && (
        <ArrowRight
          size={size === "lg" ? 20 : 16}
          weight="bold"
          aria-hidden
          className="transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-1 motion-reduce:transition-none"
        />
      )}
    </Link>
  );
}

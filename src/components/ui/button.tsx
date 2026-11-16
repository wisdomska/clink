import { forwardRef, type ButtonHTMLAttributes, type MouseEvent } from "react";
import { cn } from "./cn";
import { LoadingDots } from "./spinner";

type Variant =
  | "primary"
  | "secondary"
  | "ghost"
  | "outline"
  | "text"
  | "accent-text"
  | "danger"
  | "danger-outline";
type Size = "xl" | "lg" | "md" | "sm" | "xs";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-on-accent font-bold border-0 hover:shadow-[inset_0_0_0_99px_var(--press-glow)]",
  secondary: "bg-s2 text-text border border-line font-semibold hover:bg-s3",
  ghost:
    "bg-transparent text-text border border-line font-medium hover:border-line-strong hover:bg-s1",
  outline: "bg-transparent text-text border border-line font-medium hover:border-line-strong",
  text: "bg-transparent text-text border-0 font-medium",
  "accent-text": "bg-transparent text-accent border-0 font-bold",
  danger:
    "bg-danger text-on-accent border-0 font-bold hover:shadow-[inset_0_0_0_99px_var(--press-glow)]",
  "danger-outline": "bg-transparent text-danger border-[1.5px] border-danger font-bold",
};

// Heights from the prototype: 56 primary CTA, 52 secondary, 48 inline, 44 chips, 40 compact.
// Every size gives at least a 44 px hit target.
const sizes: Record<Size, string> = {
  xl: "h-14 px-6 text-base",
  lg: "h-[52px] px-5 text-base",
  md: "h-12 px-5 text-base",
  sm: "h-11 px-4 text-sm",
  // 40 px to look at, 44 px to hit: the invisible ::before pads the tap area.
  xs: "h-10 px-3.5 text-sm before:absolute before:inset-x-0 before:-inset-y-0.5 before:content-['']",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  /** Shows a spinner, sets aria-busy and ignores further taps. */
  loading?: boolean;
  /** Looks disabled but stays focusable and clickable, so onClick can explain why. */
  softDisabled?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "xl",
    block,
    className,
    type = "button",
    loading,
    softDisabled,
    onClick,
    children,
    ...rest
  },
  ref,
) {
  const inert = loading || softDisabled;
  return (
    <button
      ref={ref}
      type={type}
      aria-busy={loading || undefined}
      aria-disabled={inert || undefined}
      onClick={(e: MouseEvent<HTMLButtonElement>) => {
        if (loading) return e.preventDefault();
        onClick?.(e);
      }}
      className={cn(
        "press relative inline-flex cursor-pointer items-center justify-center gap-2 rounded-full whitespace-nowrap select-none disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
        variants[variant],
        sizes[size],
        block && "w-full",
        className,
      )}
      {...rest}
    >
      {loading ? (
        <>
          {/* The label keeps its space so the button never changes width. */}
          <span className="invisible inline-flex items-center gap-2">{children}</span>
          <span className="absolute inset-0 flex items-center justify-center">
            <LoadingDots />
          </span>
          <span className="sr-only">Working</span>
        </>
      ) : (
        children
      )}
    </button>
  );
});

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  tone?: "outline" | "surface" | "accent";
  dim?: number;
}

/**
 * Round icon button, 44 px by default. "outline" = back/close, "surface" = top-bar
 * actions. A smaller `dim` keeps the look but the hit area stays 44 px.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, tone = "outline", dim = 44, className, type = "button", style, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      style={{ width: dim, height: dim, ...style }}
      className={cn(
        dim < 44 &&
          "relative before:absolute before:top-1/2 before:left-1/2 before:h-11 before:w-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-['']",
        "press-icon flex flex-none cursor-pointer items-center justify-center rounded-full",
        tone === "outline" && "border-line text-text border bg-transparent",
        tone === "surface" && "border-line bg-s1 text-text border",
        tone === "accent" && "bg-accent text-on-accent border-0",
        className,
      )}
      {...rest}
    />
  );
});

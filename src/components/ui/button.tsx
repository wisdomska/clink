import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

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
  primary: "bg-accent text-on-accent font-bold border-0",
  secondary: "bg-s2 text-text border border-line font-medium",
  ghost: "bg-transparent text-text border border-line font-medium",
  outline: "bg-transparent text-text border border-line font-medium",
  text: "bg-transparent text-text border-0 font-medium",
  "accent-text": "bg-transparent text-accent border-0 font-bold",
  danger: "bg-danger text-on-accent border-0 font-bold",
  "danger-outline": "bg-transparent text-danger border-[1.5px] border-danger font-bold",
};

// Heights from the prototype: 56 primary CTA, 52 secondary, 48 inline, 44 chips, 40 compact.
const sizes: Record<Size, string> = {
  xl: "h-14 px-6 text-base",
  lg: "h-[52px] px-5 text-base",
  md: "h-12 px-5 text-base",
  sm: "h-11 px-4 text-sm",
  xs: "h-10 px-3.5 text-sm",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "xl", block, className, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "press inline-flex cursor-pointer items-center justify-center gap-2 rounded-full whitespace-nowrap select-none disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        block && "w-full",
        className,
      )}
      {...rest}
    />
  );
});

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  tone?: "outline" | "surface" | "accent";
  dim?: number;
}

/** 44 px round icon button. "outline" = back/close, "surface" = top-bar actions. */
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
        "press flex flex-none cursor-pointer items-center justify-center rounded-full",
        tone === "outline" && "border-line text-text border bg-transparent",
        tone === "surface" && "border-line bg-s1 text-text border",
        tone === "accent" && "bg-accent text-on-accent border-0",
        className,
      )}
      {...rest}
    />
  );
});

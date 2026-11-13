import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from "react";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { cn } from "./cn";

export function Label({ htmlFor, children, className }: { htmlFor?: string; children: ReactNode; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn("mb-1.5 block text-sm font-medium text-muted", className)}>
      {children}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; mono?: boolean }>(
  function Input({ className, invalid, mono, ...rest }, ref) {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          "h-[52px] w-full min-w-0 flex-none rounded-input border bg-s2 px-4 text-base text-text outline-none transition-colors focus:border-accent",
          invalid ? "border-danger" : "border-line",
          mono && "mono text-lg",
          className,
        )}
        {...rest}
      />
    );
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-[110px] w-full resize-none rounded-input border border-line bg-s2 px-4 py-3.5 text-base leading-normal text-text outline-none focus:border-accent",
        className,
      )}
      {...rest}
    />
  );
});

export function FieldError({ id, children }: { id?: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <div id={id} role="alert" className="mt-2 flex items-center gap-1.5 text-sm font-medium text-danger">
      <WarningCircle size={18} aria-hidden />
      {children}
    </div>
  );
}

export function Hint({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("mt-2 text-sm leading-normal text-faint", className)}>{children}</p>;
}

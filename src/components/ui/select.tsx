"use client";
import * as S from "@radix-ui/react-select";
import { CaretDown, Check } from "@phosphor-icons/react";
import { cn } from "./cn";

const NONE = "__none__";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * Clink's dropdown: a plum field with a caret, opening a branded list that
 * works with keyboard, screen readers and inside sheets. Type a letter to jump.
 */
export function Select({
  id,
  value,
  onChange,
  options,
  placeholder = "Choose",
  label,
  size = "md",
  className,
  disabled,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  /** Accessible name when there's no visible <Label htmlFor>. */
  label?: string;
  size?: "md" | "sm";
  className?: string;
  disabled?: boolean;
}) {
  // Radix reserves "" for "nothing chosen", so an "Any" option with value "" is encoded.
  const enc = (v: string) => (v === "" ? NONE : v);
  const hasEmpty = options.some((o) => o.value === "");
  return (
    <S.Root
      value={value === "" ? (hasEmpty ? NONE : undefined) : value}
      onValueChange={(v) => onChange(v === NONE ? "" : v)}
      disabled={disabled}
    >
      <S.Trigger
        id={id}
        aria-label={label}
        className={cn(
          "press rounded-input border-line bg-s2 text-text data-[state=open]:border-accent focus-visible:border-accent data-[placeholder]:text-faint flex w-full min-w-0 cursor-pointer items-center justify-between gap-2 border text-left outline-none disabled:cursor-not-allowed disabled:opacity-50",
          size === "md" ? "h-[52px] px-4 text-base" : "h-11 px-3 text-sm",
          className,
        )}
      >
        <span className="min-w-0 truncate">
          <S.Value placeholder={placeholder} />
        </span>
        <S.Icon asChild>
          <CaretDown size={16} weight="bold" className="text-muted flex-none" aria-hidden />
        </S.Icon>
      </S.Trigger>
      <S.Portal>
        <S.Content
          position="popper"
          sideOffset={6}
          collisionPadding={12}
          className="select-pop rounded-card border-line bg-s1 z-[80] max-h-[min(360px,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden border shadow-[var(--shadow-float)]"
        >
          <S.Viewport className="p-1.5">
            {options.map((o) => (
              <S.Item
                key={o.value}
                value={enc(o.value)}
                disabled={o.disabled}
                className="text-text data-[highlighted]:bg-s3 data-[state=checked]:text-accent relative flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-[10px] px-3 text-base outline-none select-none data-[disabled]:opacity-40"
              >
                <S.ItemText>{o.label}</S.ItemText>
                <S.ItemIndicator>
                  <Check size={18} weight="bold" aria-hidden />
                </S.ItemIndicator>
              </S.Item>
            ))}
          </S.Viewport>
        </S.Content>
      </S.Portal>
    </S.Root>
  );
}

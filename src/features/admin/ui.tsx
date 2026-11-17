"use client";
import { useRef, useState, type ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "@phosphor-icons/react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { FieldError, Label } from "@/components/ui/field";
import { cn } from "@/components/ui/cn";

/* ---------------------------------------------------------------- dialogs */

export interface ConfirmOptions {
  title: string;
  body: string;
  confirm: string;
  danger?: boolean;
  /** Ask for a reason (kept in the audit log). */
  reason?: "optional" | "required";
  /** Irreversible: the person must type this word to enable the button. */
  typed?: string;
}

/**
 * In-app replacement for window.confirm / window.prompt. `ask()` resolves to
 * { reason } when confirmed, or null when cancelled. Destructive dialogs focus
 * Cancel first, and stay open while the action runs.
 */
export function useConfirm() {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [reason, setReason] = useState("");
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const resolver = useRef<((v: { reason?: string } | null) => void) | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const ask = (o: ConfirmOptions) =>
    new Promise<{ reason?: string } | null>((resolve) => {
      resolver.current = resolve;
      setReason("");
      setTyped("");
      setError(null);
      setOpts(o);
    });

  const close = (v: { reason?: string } | null) => {
    resolver.current?.(v);
    resolver.current = null;
    setOpts(null);
  };

  const dialog = (
    <Sheet
      open={opts !== null}
      onOpenChange={(v) => !v && close(null)}
      title={opts?.title ?? ""}
      initialFocus={opts?.danger ? cancelRef : undefined}
      handle
    >
      {opts && (
        <>
          <div className="display text-[28px] leading-[1.1]">{opts.title}</div>
          <p className="text-muted m-0 text-base leading-normal">{opts.body}</p>
          {opts.reason && (
            <div>
              <Label htmlFor="confirm-reason">
                Reason{opts.reason === "optional" ? " (optional)" : ""}
              </Label>
              <textarea
                id="confirm-reason"
                value={reason}
                maxLength={300}
                onChange={(e) => setReason(e.target.value)}
                className="rounded-input border-line bg-s2 text-text min-h-20 w-full border p-3 text-base"
              />
            </div>
          )}
          {opts.typed && (
            <div>
              <Label htmlFor="confirm-typed">Type {opts.typed} to confirm</Label>
              <input
                id="confirm-typed"
                value={typed}
                autoComplete="off"
                onChange={(e) => setTyped(e.target.value)}
                className="rounded-input border-line bg-s2 text-text mono h-[52px] w-full border px-3 text-base"
              />
            </div>
          )}
          <FieldError>{error}</FieldError>
          <Button
            variant={opts.danger ? "danger" : "primary"}
            softDisabled={Boolean(opts.typed && typed.trim() !== opts.typed)}
            onClick={() => {
              if (opts.typed && typed.trim() !== opts.typed)
                return setError(`Type ${opts.typed} exactly to confirm.`);
              if (opts.reason === "required" && reason.trim().length < 3)
                return setError("Add a short reason. It goes in the audit log.");
              close({ reason: reason.trim() || undefined });
            }}
          >
            {opts.confirm}
          </Button>
          <Button ref={cancelRef} variant="ghost" size="lg" onClick={() => close(null)}>
            Cancel
          </Button>
        </>
      )}
    </Sheet>
  );

  return { ask, dialog };
}

/** In-app text prompt: resolves to the text, or null when cancelled. */
export function usePrompt() {
  const [opts, setOpts] = useState<{ title: string; label: string; value: string } | null>(null);
  const [value, setValue] = useState("");
  const resolver = useRef<((v: string | null) => void) | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const ask = (o: { title: string; label: string; value?: string }) =>
    new Promise<string | null>((resolve) => {
      resolver.current = resolve;
      setValue(o.value ?? "");
      setOpts({ ...o, value: o.value ?? "" });
    });
  const close = (v: string | null) => {
    resolver.current?.(v);
    resolver.current = null;
    setOpts(null);
  };

  const dialog = (
    <Sheet
      open={opts !== null}
      onOpenChange={(v) => !v && close(null)}
      title={opts?.title ?? ""}
      initialFocus={inputRef}
      handle
    >
      {opts && (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            close(value.trim() ? value : null);
          }}
        >
          <div className="display text-[28px] leading-[1.1]">{opts.title}</div>
          <div>
            <Label htmlFor="prompt-value">{opts.label}</Label>
            <textarea
              ref={inputRef}
              id="prompt-value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="rounded-input border-line bg-s2 text-text min-h-24 w-full border p-3 text-base"
            />
          </div>
          <Button type="submit" softDisabled={!value.trim()}>
            Save
          </Button>
          <Button variant="ghost" size="lg" onClick={() => close(null)}>
            Cancel
          </Button>
        </form>
      )}
    </Sheet>
  );
  return { ask, dialog };
}

/* ---------------------------------------------------------------- charts */

/** Tiny SVG trend line. Decorative; pair it with a number and an sr-only table. */
export function Sparkline({
  values,
  className,
  colour = "var(--accent)",
}: {
  values: number[];
  className?: string;
  colour?: string;
}) {
  const w = 120;
  const h = 32;
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const points = values.map((v, i) => `${i * step},${h - 2 - (v / max) * (h - 4)}`).join(" ");
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden
      className={cn("h-8 w-full overflow-visible", className)}
    >
      <polyline
        points={points}
        fill="none"
        stroke={colour}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** Change vs the previous period, with an arrow so it never relies on colour alone. */
export function Delta({ current, previous }: { current: number; previous: number }) {
  if (!previous && !current) return <span className="text-faint text-xs">No change</span>;
  const pct = previous ? Math.round(((current - previous) / previous) * 100) : 100;
  const Icon = pct > 0 ? ArrowUpRight : pct < 0 ? ArrowDownRight : Minus;
  const tone = pct > 0 ? "var(--accent)" : pct < 0 ? "var(--warning)" : "var(--text-faint)";
  return (
    <span
      className="inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{ color: tone, background: `color-mix(in oklab, ${tone} 14%, transparent)` }}
    >
      <Icon size={14} weight="bold" aria-hidden />
      {pct > 0 ? "+" : ""}
      {pct}% vs previous
    </span>
  );
}

export function TrendCard({
  label,
  current,
  previous,
  series,
  days,
  footnote,
}: {
  label: string;
  current: number;
  previous: number;
  series: Array<{ day: string; value: number }>;
  days: number;
  footnote?: ReactNode;
}) {
  return (
    <div className="bg-s1 flex flex-col gap-2 p-4">
      <div className="text-muted text-sm">{label}</div>
      <div className="mono text-[28px] leading-none tabular-nums">
        {current.toLocaleString("en-GB")}
      </div>
      <Delta current={current} previous={previous} />
      <Sparkline values={series.map((s) => s.value)} />
      <table className="sr-only">
        <caption>
          {label}, daily, last {days} days
        </caption>
        <tbody>
          {series.map((s) => (
            <tr key={s.day}>
              <th scope="row">{s.day}</th>
              <td>{s.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {footnote && <div className="text-faint text-xs">{footnote}</div>}
    </div>
  );
}

/* ---------------------------------------------------------------- csv */

/** Guards against spreadsheet formula injection: cells starting = + - @ get a leading quote. */
export function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Array<Record<string, unknown>>): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]!);
  return [
    cols.map(csvCell).join(","),
    ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(",")),
  ].join("\r\n");
}

export function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  const blob = new Blob(["﻿" + toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

"use client";
import { useMemo, useState } from "react";
import * as P from "@radix-ui/react-popover";
import { CalendarBlank, CaretLeft, CaretRight, Clock } from "@phosphor-icons/react";
import { cn } from "./cn";
import { Select } from "./select";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const todayIso = () => {
  const t = new Date();
  return iso(t.getFullYear(), t.getMonth(), t.getDate());
};
function parse(v: string | null | undefined) {
  const m = v?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? { y: +m[1]!, m: +m[2]! - 1, d: +m[3]! } : null;
}
/** Scroll a list so this row sits mid-column, without moving the page. */
function centre(el: HTMLElement) {
  const box = el.parentElement;
  if (box) box.scrollTop = el.offsetTop - box.clientHeight / 2 + el.clientHeight / 2;
}
const daysIn = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

const field =
  "press rounded-input border-line bg-s2 text-text data-[state=open]:border-accent focus-visible:border-accent flex w-full min-w-0 cursor-pointer items-center gap-2.5 border text-left outline-none disabled:cursor-not-allowed disabled:opacity-50";
/** Field heights match Input and Select: 52 px, or 44 px for compact filter bars. */
const SIZES = { md: "h-[52px] px-4 text-base", sm: "h-11 px-3 text-sm" } as const;
const pop =
  "picker-pop rounded-card border-line bg-s1 z-[80] border p-3 shadow-[var(--shadow-float)] outline-none";

/** "Sat 14 Feb 2027" */
export function formatDay(v: string): string {
  const p = parse(v);
  if (!p) return "";
  return new Date(p.y, p.m, p.d).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Month grid in Clink colours. Monday first; days outside min/max are disabled. */
export function Calendar({
  value,
  onPick,
  min,
  max,
}: {
  value: string;
  onPick: (v: string) => void;
  min?: string;
  max?: string;
}) {
  const sel = parse(value);
  const start = sel ?? parse(todayIso())!;
  const [view, setView] = useState({ y: start.y, m: start.m });
  const today = todayIso();
  const cells = useMemo(() => {
    const lead = (new Date(view.y, view.m, 1).getDay() + 6) % 7;
    const n = daysIn(view.y, view.m);
    return [...Array(lead).fill(null), ...Array.from({ length: n }, (_, i) => i + 1)] as Array<
      number | null
    >;
  }, [view]);
  const step = (d: number) =>
    setView((v) => {
      const m = v.m + d;
      return { y: v.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 };
    });

  return (
    <div className="w-[296px] max-w-full">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label="Previous month"
          className="press text-muted hover:bg-s2 hover:text-text flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent"
        >
          <CaretLeft size={18} weight="bold" />
        </button>
        <div className="text-base font-semibold" aria-live="polite">
          {MONTHS[view.m]} {view.y}
        </div>
        <button
          type="button"
          onClick={() => step(1)}
          aria-label="Next month"
          className="press text-muted hover:bg-s2 hover:text-text flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent"
        >
          <CaretRight size={18} weight="bold" />
        </button>
      </div>
      <div
        className="grid grid-cols-7 gap-0.5"
        role="grid"
        aria-label={`${MONTHS[view.m]} ${view.y}`}
      >
        {DAYS.map((d) => (
          <div key={d} className="text-faint py-1 text-center text-xs font-semibold" aria-hidden>
            {d}
          </div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <span key={`x${i}`} />;
          const v = iso(view.y, view.m, d);
          const on = v === value;
          const off = (min && v < min) || (max && v > max);
          return (
            <button
              key={v}
              type="button"
              disabled={Boolean(off)}
              aria-pressed={on}
              aria-label={formatDay(v)}
              onClick={() => onPick(v)}
              className={cn(
                "mono flex aspect-square cursor-pointer items-center justify-center rounded-full border-0 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-25",
                on
                  ? "bg-accent text-on-accent font-bold"
                  : v === today
                    ? "bg-s2 text-accent font-bold"
                    : "text-text hover:bg-s2 bg-transparent",
              )}
            >
              {d}
            </button>
          );
        })}
      </div>
      <div className="border-line mt-2 flex justify-between border-t pt-2">
        <button
          type="button"
          onClick={() => {
            const t = parse(today)!;
            setView({ y: t.y, m: t.m });
            if (!(min && today < min) && !(max && today > max)) onPick(today);
          }}
          className="press text-accent cursor-pointer rounded-full border-0 bg-transparent px-3 py-2 text-sm font-semibold"
        >
          Today
        </button>
      </div>
    </div>
  );
}

/** A date field that opens Clink's calendar. Value is "YYYY-MM-DD" (or ""). */
export function DateField({
  id,
  value,
  onChange,
  min,
  max,
  placeholder = "Pick a date",
  label,
  className,
  disabled,
  size = "md",
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
  size?: keyof typeof SIZES;
}) {
  const [open, setOpen] = useState(false);
  return (
    <P.Root open={open} onOpenChange={setOpen}>
      <P.Trigger
        id={id}
        disabled={disabled}
        aria-label={label ? `${label}${value ? `: ${formatDay(value)}` : ""}` : undefined}
        className={cn(field, SIZES[size], className)}
      >
        <CalendarBlank size={20} className="text-muted flex-none" aria-hidden />
        <span className={cn("min-w-0 truncate", !value && "text-faint")}>
          {value ? formatDay(value) : placeholder}
        </span>
      </P.Trigger>
      <P.Portal>
        <P.Content sideOffset={6} collisionPadding={12} align="start" className={pop}>
          <Calendar
            value={value}
            min={min}
            max={max}
            onPick={(v) => {
              onChange(v);
              setOpen(false);
            }}
          />
        </P.Content>
      </P.Portal>
    </P.Root>
  );
}

/** A time field: hours and minutes in two scrolling columns. Value is "HH:MM" (24 h). */
export function TimeField({
  id,
  value,
  onChange,
  label,
  className,
  disabled,
  step = 5,
  size = "md",
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
  step?: number;
  size?: keyof typeof SIZES;
}) {
  const [open, setOpen] = useState(false);
  const [h, m] = (value || "").split(":");
  const steps = Array.from({ length: 60 / step }, (_, i) => pad(i * step));
  // Keep an off-step minute (say 21:07) selectable rather than silently rounding it.
  const mins = m && !steps.includes(m) ? [...steps, m].sort() : steps;
  const set = (hh: string, mm: string) => onChange(`${hh}:${mm}`);
  const col = "no-scrollbar flex max-h-[232px] flex-col gap-0.5 overflow-y-auto scroll-py-2 pr-0.5";
  const cell = (on: boolean) =>
    cn(
      "mono flex h-10 w-16 flex-none cursor-pointer items-center justify-center rounded-[10px] border-0 text-base",
      on ? "bg-accent text-on-accent font-bold" : "text-text hover:bg-s2 bg-transparent",
    );
  return (
    <P.Root open={open} onOpenChange={setOpen}>
      <P.Trigger
        id={id}
        disabled={disabled}
        aria-label={label ? `${label}${value ? `: ${value}` : ""}` : undefined}
        className={cn(field, SIZES[size], className)}
      >
        <Clock size={20} className="text-muted flex-none" aria-hidden />
        <span className={cn("mono", !value && "text-faint")}>{value || "--:--"}</span>
      </P.Trigger>
      <P.Portal>
        <P.Content sideOffset={6} collisionPadding={12} align="start" className={pop}>
          <div className="flex gap-2">
            <div className={col} role="listbox" aria-label="Hour">
              {Array.from({ length: 24 }, (_, i) => pad(i)).map((hh) => (
                <button
                  key={hh}
                  type="button"
                  role="option"
                  aria-selected={hh === h}
                  ref={(el) => {
                    if (el && hh === h) centre(el);
                  }}
                  onClick={() => set(hh, m ?? "00")}
                  className={cell(hh === h)}
                >
                  {hh}
                </button>
              ))}
            </div>
            <div className="text-faint self-center text-lg font-bold" aria-hidden>
              :
            </div>
            <div className={col} role="listbox" aria-label="Minute">
              {mins.map((mm) => (
                <button
                  key={mm}
                  type="button"
                  role="option"
                  aria-selected={mm === m}
                  ref={(el) => {
                    if (el && mm === m) centre(el);
                  }}
                  onClick={() => {
                    set(h ?? "12", mm);
                    setOpen(false);
                  }}
                  className={cell(mm === m)}
                >
                  {mm}
                </button>
              ))}
            </div>
          </div>
        </P.Content>
      </P.Portal>
    </P.Root>
  );
}

/**
 * Birthday as three branded dropdowns: day, month by name, year (newest
 * first). Nothing to type, no fiddly native date wheel. Emits "YYYY-MM-DD"
 * once all three are chosen, "" until then.
 */
export function BirthdayField({
  value,
  onChange,
  idPrefix = "dob",
}: {
  value: string;
  onChange: (v: string) => void;
  idPrefix?: string;
}) {
  const p = parse(value);
  const [d, setD] = useState(p ? String(p.d) : "");
  const [mo, setMo] = useState(p ? String(p.m) : "");
  const [y, setY] = useState(p ? String(p.y) : "");
  const now = new Date().getFullYear();
  const maxDay = y && mo ? daysIn(+y, +mo) : mo ? daysIn(2000, +mo) : 31;

  const emit = (dd: string, mm: string, yy: string) => {
    if (dd && mm && yy) {
      const day = Math.min(+dd, daysIn(+yy, +mm));
      if (day !== +dd) setD(String(day));
      onChange(iso(+yy, +mm, day));
    } else onChange("");
  };

  return (
    <div className="grid grid-cols-[1fr_1.6fr_1.2fr] gap-2" role="group" aria-label="Date of birth">
      <Select
        id={`${idPrefix}-day`}
        label="Day"
        value={d}
        placeholder="Day"
        options={Array.from({ length: maxDay }, (_, i) => ({
          value: String(i + 1),
          label: String(i + 1),
        }))}
        onChange={(v) => {
          setD(v);
          emit(v, mo, y);
        }}
      />
      <Select
        id={`${idPrefix}-month`}
        label="Month"
        value={mo}
        placeholder="Month"
        options={MONTHS.map((name, i) => ({ value: String(i), label: name }))}
        onChange={(v) => {
          setMo(v);
          emit(d, v, y);
        }}
      />
      <Select
        id={`${idPrefix}-year`}
        label="Year"
        value={y}
        placeholder="Year"
        options={Array.from({ length: 101 }, (_, i) => ({
          value: String(now - i),
          label: String(now - i),
        }))}
        onChange={(v) => {
          setY(v);
          emit(d, mo, v);
        }}
      />
    </div>
  );
}

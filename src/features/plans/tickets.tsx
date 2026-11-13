"use client";
import { CheckCircle } from "@phosphor-icons/react";

/** The big next-date ticket stub: perforated edge with notches, accent "Admit two" stub that tears off. */
export function TicketStub({
  label,
  title,
  times,
  ticketNo,
  torn,
}: {
  label: string;
  title: React.ReactNode;
  times: React.ReactNode;
  ticketNo: string;
  torn: boolean;
}) {
  return (
    <div className="relative h-[176px] flex-none md:h-[200px]">
      <div className="absolute inset-0 flex">
        <div className="flex flex-1 flex-col justify-between rounded-l-[20px] bg-s2 p-[18px] md:p-6">
          <div className="mono text-xs tracking-[.06em] text-muted">{label}</div>
          <div className="display text-[36px] leading-none md:text-[44px]">{title}</div>
          <div className="mono flex flex-wrap gap-3 text-[13px] text-text">{times}</div>
        </div>
        <div className="relative w-0 border-l-2 border-dashed border-app" aria-hidden>
          <span className="absolute -top-2.5 -left-[11px] h-5 w-5 rounded-full bg-app" />
          <span className="absolute -bottom-2.5 -left-[11px] h-5 w-5 rounded-full bg-app" />
        </div>
        <div className="w-[84px]" />
      </div>
      {!torn ? (
        <div className="absolute inset-y-0 right-0 flex w-[84px] flex-col items-center justify-center gap-2 rounded-r-[20px] bg-accent text-on-accent">
          <span className="mono text-sm tracking-[.2em]" style={{ writingMode: "vertical-rl" }}>
            ADMIT TWO
          </span>
          <span className="mono text-[11px]">{ticketNo}</span>
        </div>
      ) : (
        <>
          <div aria-hidden className="an-tear absolute inset-y-0 right-0 w-[84px] rounded-r-[20px] bg-accent" />
          <div className="absolute inset-y-0 right-0 flex w-[84px] items-center justify-center text-accent">
            <CheckCircle size={32} aria-label="Done" />
          </div>
        </>
      )}
    </div>
  );
}

/** Small kit stub used in the horizontal kit row. */
export function KitStub({ title, minutes, i }: { title: string; minutes: number; i: number }) {
  const mins = minutes >= 120 && minutes % 60 === 0 ? `${minutes / 60} h` : `${minutes} min`;
  return (
    <div className="an-rise flex h-[104px] w-[200px] flex-none overflow-hidden rounded-ticket" style={{ ["--i" as string]: i }}>
      <div className="flex flex-1 flex-col justify-between rounded-l-ticket border border-r-0 border-line bg-s1 p-3">
        <span className="display text-xl leading-[1.05] tracking-normal">{title}</span>
        <span className="mono text-xs text-muted">{mins}</span>
      </div>
      <div className="w-0 border-l-2 border-dashed border-line" aria-hidden />
      <div className="mono flex w-[30px] items-center justify-center rounded-r-ticket border border-l-0 border-line bg-s2 text-[11px] tracking-[.1em] text-faint" style={{ writingMode: "vertical-rl" }}>
        ADMIT 2
      </div>
    </div>
  );
}

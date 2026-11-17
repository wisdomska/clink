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
        <div className="bg-s2 rounded-l-card flex flex-1 flex-col justify-between p-[18px] md:p-6">
          <div className="mono text-muted text-xs">{label}</div>
          <div className="display text-[36px] leading-none md:text-[48px]">{title}</div>
          <div className="mono text-text flex flex-wrap gap-3 text-[13px]">{times}</div>
        </div>
        <div className="border-app relative w-0 border-l-2 border-dashed" aria-hidden>
          <span className="bg-app absolute -top-2.5 -left-[11px] h-5 w-5 rounded-full" />
          <span className="bg-app absolute -bottom-2.5 -left-[11px] h-5 w-5 rounded-full" />
        </div>
        <div className="w-[84px]" />
      </div>
      {!torn ? (
        <div className="bg-accent text-on-accent rounded-r-card absolute inset-y-0 right-0 flex w-[84px] flex-col items-center justify-center gap-2">
          <span className="mono text-sm" style={{ writingMode: "vertical-rl" }}>
            ADMIT TWO
          </span>
          <span className="mono text-[11px]">{ticketNo}</span>
        </div>
      ) : (
        <>
          <div
            aria-hidden
            className="an-tear bg-accent rounded-r-card absolute inset-y-0 right-0 w-[84px]"
          />
          <div className="text-accent absolute inset-y-0 right-0 flex w-[84px] items-center justify-center">
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
    <div
      className="an-rise rounded-ticket flex h-[104px] w-[200px] flex-none overflow-hidden"
      style={{ ["--i" as string]: i }}
    >
      <div className="rounded-l-ticket border-line bg-s1 flex flex-1 flex-col justify-between border border-r-0 p-3">
        <span className="display text-xl leading-[1.05] tracking-normal">{title}</span>
        <span className="mono text-muted text-xs">{mins}</span>
      </div>
      <div className="border-line w-0 border-l-2 border-dashed" aria-hidden />
      <div
        className="mono rounded-r-ticket border-line bg-s2 text-faint flex w-[30px] items-center justify-center border border-l-0 text-[11px]"
        style={{ writingMode: "vertical-rl" }}
      >
        Admit 2
      </div>
    </div>
  );
}

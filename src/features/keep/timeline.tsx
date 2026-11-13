"use client";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react";
import { useCouple } from "@/features/couple/context";
import { IconButton } from "@/components/ui/button";
import { Display, Mono } from "@/components/ui/heading";
import { useKeep, tagDate } from "./data";

/** KEEP-03 full timeline: auto milestones plus manual entries with photos. */
export function TimelineScreen() {
  const router = useRouter();
  const { linkedAt, startedOn } = useCouple();
  const { data } = useKeep();
  const days = Math.floor((Date.now() - new Date(startedOn ?? linkedAt).getTime()) / 86400000);
  return (
    <div className="screen an-screen flex max-w-[720px] flex-col gap-5">
      <IconButton label="Back" onClick={() => router.push("/keep")}>
        <ArrowLeft size={20} />
      </IconButton>
      <div>
        <Display size={48}>Timeline</Display>
        <p className="mono m-0 mt-1 text-sm text-muted">DAY {days.toLocaleString("en-GB")} {startedOn ? "TOGETHER" : "ON CLINK"}</p>
      </div>
      <ol className="m-0 ml-1.5 flex list-none flex-col border-l-[1.5px] border-line p-0">
        {(data?.timeline ?? []).map((t, i) => (
          <li key={t.id} className="an-rise relative pb-6 pl-5" style={{ ["--i" as string]: Math.min(i, 10) }}>
            <span aria-hidden className="absolute top-1 -left-1.5 h-2.5 w-2.5 rounded-full border-[1.5px] border-accent bg-app" />
            <Mono>
              {tagDate(`${t.happened_on}T12:00:00Z`)} · {t.kind === "auto" ? "AUTO" : "ADDED"}
            </Mono>
            <div className="mt-0.5 text-base font-medium">{t.title}</div>
            {t.media_id && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/media/${t.media_id}/view`} alt="" loading="lazy" className="mt-2 max-h-56 rounded-thumb object-cover" />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

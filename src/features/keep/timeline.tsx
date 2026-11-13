"use client";
import { useState } from "react";
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
  const [now] = useState(() => Date.now());
  const days = Math.floor((now - new Date(startedOn ?? linkedAt).getTime()) / 86400000);
  return (
    <div className="screen an-screen flex max-w-[720px] flex-col gap-5">
      <IconButton label="Back" onClick={() => router.push("/keep")}>
        <ArrowLeft size={20} />
      </IconButton>
      <div>
        <Display size={48}>Timeline</Display>
        <p className="mono text-muted m-0 mt-1 text-sm">
          DAY {days.toLocaleString("en-GB")} {startedOn ? "TOGETHER" : "ON CLINK"}
        </p>
      </div>
      <ol className="border-line m-0 ml-1.5 flex list-none flex-col border-l-[1.5px] p-0">
        {(data?.timeline ?? []).map((t, i) => (
          <li
            key={t.id}
            className="an-rise relative pb-6 pl-5"
            style={{ ["--i" as string]: Math.min(i, 10) }}
          >
            <span
              aria-hidden
              className="border-accent bg-app absolute top-1 -left-1.5 h-2.5 w-2.5 rounded-full border-[1.5px]"
            />
            <Mono>
              {tagDate(`${t.happened_on}T12:00:00Z`)} · {t.kind === "auto" ? "AUTO" : "ADDED"}
            </Mono>
            <div className="mt-0.5 text-base font-medium">{t.title}</div>
            {t.media_id && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/media/${t.media_id}/view`}
                alt=""
                loading="lazy"
                className="rounded-thumb mt-2 max-h-56 object-cover"
              />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

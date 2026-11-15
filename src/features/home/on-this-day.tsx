"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useCouple, useCoupleNow } from "@/features/couple/context";
import { localParts } from "@/lib/time";

/**
 * "On this day" (like Snapchat Memories): a photo you two shared on this date
 * in an earlier year, or failing that, this day in an earlier month.
 */
export function OnThisDay() {
  const { coupleId, me } = useCouple();
  const now = useCoupleNow(60 * 60 * 1000);
  const today = localParts(now, me.timezone).dateKey; // YYYY-MM-DD
  const { data } = useQuery({
    queryKey: ["on-this-day", coupleId, today],
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabaseBrowser()
        .from("media")
        .select("id, created_at")
        .eq("kind", "image")
        .eq("is_sensitive", false)
        .eq("status", "ready")
        .is("deleted_at", null)
        .lt("created_at", `${today.slice(0, 8)}01`)
        .order("created_at", { ascending: false })
        .limit(2000);
      const rows = (data ?? []).map((m) => ({
        ...m,
        key: localParts(new Date(m.created_at), me.timezone).dateKey,
      }));
      const mmdd = today.slice(5);
      const dd = today.slice(8);
      const year = rows.find((r) => r.key.slice(5) === mmdd);
      const month = year ?? rows.find((r) => r.key.slice(8) === dd);
      if (!month) return null;
      const [ty, tm] = [Number(today.slice(0, 4)), Number(today.slice(5, 7))];
      const [y, m] = [Number(month.key.slice(0, 4)), Number(month.key.slice(5, 7))];
      const months = (ty - y) * 12 + (tm - m);
      const label =
        months % 12 === 0
          ? `${months / 12} year${months > 12 ? "s" : ""} ago today`
          : `${months} month${months > 1 ? "s" : ""} ago today`;
      return { id: month.id, label };
    },
  });
  if (!data) return null;
  return (
    <motion.section
      aria-label="On this day"
      initial={{ opacity: 0.01, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-none"
    >
      <Link
        href={`/chat/media/${data.id}`}
        className="group border-line relative block h-44 overflow-hidden rounded-[28px] border"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/media/${data.id}/view`}
          alt="A photo you shared"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <span className="absolute bottom-3 left-4 flex flex-col text-white">
          <span className="mono text-[11px] tracking-wide opacity-80">ON THIS DAY</span>
          <span className="display text-[22px] leading-tight">{data.label}</span>
        </span>
      </Link>
    </motion.section>
  );
}

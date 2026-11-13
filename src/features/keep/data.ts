"use client";
import { useQuery } from "@tanstack/react-query";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useCouple } from "@/features/couple/context";

export function useKeep() {
  const { coupleId } = useCouple();
  return useQuery({
    queryKey: ["keep", coupleId],
    queryFn: async () => {
      const sb = supabaseBrowser();
      const [letters, capsules, timeline, wall] = await Promise.all([
        sb.from("letters").select("id, author_id, condition, sealed_at, opened_at").order("sealed_at", { ascending: false }),
        sb.from("capsules").select("id, author_id, title, unlock_at, opened_at, created_at").order("unlock_at"),
        sb.from("timeline_entries").select("id, kind, title, happened_on, media_id, created_by").order("happened_on", { ascending: false }).limit(50),
        sb.from("media").select("id, kind, created_at").eq("is_favourite", true).eq("kind", "image").order("created_at", { ascending: false }).limit(24),
      ]);
      return { letters: letters.data ?? [], capsules: capsules.data ?? [], timeline: timeline.data ?? [], wall: wall.data ?? [] };
    },
  });
}

export const tagDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }).toUpperCase();

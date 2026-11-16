"use client";
import { useQuery } from "@tanstack/react-query";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useCouple } from "@/features/couple/context";
import { getPage, useCursorList } from "@/features/plans/infinite";

export interface LetterRow {
  id: string;
  author_id: string;
  condition: string;
  sealed_at: string;
  opened_at: string | null;
}

export interface CapsuleRow {
  id: string;
  author_id: string;
  title: string;
  unlock_at: string;
  opened_at: string | null;
  created_at: string;
}

export interface TimelineRow {
  id: string;
  kind: string;
  title: string;
  happened_on: string;
  media_id: string | null;
  created_by: string | null;
}

/** The Keep hub's small, bounded bits: a timeline preview and the memory wall. */
export function useKeep() {
  const { coupleId } = useCouple();
  return useQuery({
    queryKey: ["keep", coupleId],
    staleTime: 30_000,
    queryFn: async () => {
      const sb = supabaseBrowser();
      const [timeline, favs, kept] = await Promise.all([
        sb
          .from("timeline_entries")
          .select("id, kind, title, happened_on, media_id, created_by")
          .order("happened_on", { ascending: false })
          .order("id", { ascending: false })
          .limit(6),
        sb
          .from("media")
          .select("id, kind, created_at")
          .eq("is_favourite", true)
          .eq("kind", "image")
          .order("created_at", { ascending: false })
          .limit(24),
        // Photos kept on the timeline (from chat or added as a memory) belong on the wall too.
        sb
          .from("timeline_entries")
          .select("media_id, created_at, media:media_id(id, kind, created_at)")
          .not("media_id", "is", null)
          .order("created_at", { ascending: false })
          .limit(24),
      ]);
      type WallItem = { id: string; kind: string; created_at: string };
      const byId = new Map<string, WallItem>();
      for (const k of kept.data ?? []) {
        const m = k.media as WallItem | null;
        // Newest first by when it was kept; RLS hides private media (m is null).
        if (m?.kind === "image") byId.set(m.id, { ...m, created_at: k.created_at });
      }
      for (const f of favs.data ?? []) if (!byId.has(f.id)) byId.set(f.id, f);
      const wall = [...byId.values()]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 24);
      return {
        timeline: (timeline.data ?? []) as TimelineRow[],
        wall,
      };
    },
  });
}

export const lettersKey = (coupleId: string, who: "me" | "partner") =>
  ["keep", coupleId, "letters", who] as const;
export const capsulesKey = (coupleId: string) => ["keep", coupleId, "capsules"] as const;
export const timelineKey = (coupleId: string) => ["keep", coupleId, "timeline"] as const;

/** Letters, newest first, 20 at a time. `me` is "Sealed by you". */
export function useLetters(who: "me" | "partner") {
  const { coupleId } = useCouple();
  return useCursorList<LetterRow>({
    queryKey: lettersKey(coupleId, who),
    fetchPage: (cursor) => getPage<LetterRow>("/api/letters", cursor, { author: who }),
  });
}

/** Capsules, soonest unlock first, 20 at a time. */
export function useCapsules() {
  const { coupleId } = useCouple();
  return useCursorList<CapsuleRow>({
    queryKey: capsulesKey(coupleId),
    fetchPage: (cursor) => getPage<CapsuleRow>("/api/capsules", cursor),
  });
}

/** The full timeline, most recent first, 20 at a time. */
export function useTimeline() {
  const { coupleId } = useCouple();
  return useCursorList<TimelineRow>({
    queryKey: timelineKey(coupleId),
    fetchPage: (cursor) => getPage<TimelineRow>("/api/timeline", cursor),
  });
}

export const tagDate = (iso: string) =>
  new Date(iso)
    .toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    .toUpperCase();

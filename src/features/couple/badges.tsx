"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCouple } from "@/features/couple/context";
import { supabaseBrowser } from "@/lib/supabase/client";
import { subscribeAuthed } from "@/lib/realtime";

export interface Badges {
  /** Your partner's messages you haven't read. */
  chat: number;
  /** Games waiting on your move, plus invites to join. */
  play: number;
  total: number;
}

const EMPTY: Badges = { chat: 0, play: 0, total: 0 };

/**
 * What's waiting for you, for the tab bar, the rail and the app icon. After
 * Dark is left out on purpose: an icon badge would give it away.
 */
export function useBadges(): Badges {
  const { coupleId, me, solo } = useCouple();
  const { data } = useQuery({
    queryKey: ["badges", coupleId],
    enabled: !solo && Boolean(coupleId),
    refetchInterval: 30_000,
    staleTime: 5_000,
    queryFn: async (): Promise<Badges> => {
      const sb = supabaseBrowser();
      const [chat, turns, invites] = await Promise.all([
        sb
          .from("messages")
          .select("id", { count: "exact", head: true })
          .neq("sender_id", me.id)
          .is("read_at", null)
          .is("removed_at", null)
          .not("type", "in", "(system,clink)"),
        sb
          .from("games")
          .select("id", { count: "exact", head: true })
          .eq("status", "active")
          .eq("current_turn_user", me.id),
        sb
          .from("games")
          .select("id", { count: "exact", head: true })
          .eq("status", "invited")
          .neq("created_by", me.id),
      ]);
      const c = chat.count ?? 0;
      const p = (turns.count ?? 0) + (invites.count ?? 0);
      return { chat: c, play: p, total: c + p };
    },
  });
  return data ?? EMPTY;
}

/** Keeps the counts live (messages and games change in realtime) and mirrors the total on the app icon. */
export function BadgeSync() {
  const { coupleId, solo } = useCouple();
  const qc = useQueryClient();
  const path = usePathname();
  const { total } = useBadges();

  useEffect(() => {
    if (solo || !coupleId) return;
    const refresh = () => void qc.invalidateQueries({ queryKey: ["badges", coupleId] });
    const ch = supabaseBrowser()
      .channel(`badges:${coupleId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `couple_id=eq.${coupleId}` },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "games", filter: `couple_id=eq.${coupleId}` },
        refresh,
      );
    return subscribeAuthed(ch);
  }, [coupleId, solo, qc]);

  // Leaving a screen often means you've just read or played something.
  useEffect(() => {
    if (coupleId) void qc.invalidateQueries({ queryKey: ["badges", coupleId] });
  }, [path, coupleId, qc]);

  // The installed app's icon (Badging API: home-screen apps on iOS 16.4+, Chrome, Edge).
  useEffect(() => {
    const nav = navigator as Navigator & {
      setAppBadge?: (n?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (!nav.setAppBadge) return;
    void (total > 0 ? nav.setAppBadge(total) : nav.clearAppBadge?.())?.catch(() => undefined);
  }, [total]);

  return null;
}

/** A small count pill for nav icons: "9+" past nine. */
export function CountBadge({ n, label }: { n: number; label: string }) {
  if (n <= 0) return null;
  return (
    <span
      role="status"
      aria-label={`${n} ${label}`}
      className="bg-accent text-on-accent mono absolute -top-1 right-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] leading-none font-bold shadow-[0_0_0_2px_var(--bg-app)]"
    >
      {n > 9 ? "9+" : n}
    </span>
  );
}

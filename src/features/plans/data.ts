"use client";
import { useQuery } from "@tanstack/react-query";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useCouple } from "@/features/couple/context";

export function useKits() {
  return useQuery({
    queryKey: ["kits"],
    staleTime: Infinity,
    queryFn: async () =>
      (await supabaseBrowser().from("date_kits").select("*").order("sort")).data ?? [],
  });
}

export function useUpcomingDates() {
  const { coupleId } = useCouple();
  return useQuery({
    queryKey: ["dates", coupleId],
    queryFn: async () =>
      (
        await supabaseBrowser()
          .from("scheduled_dates")
          .select("id, kit_id, start_at, status, ticket_no, completed_at, date_kits(title, slug)")
          .in("status", ["scheduled", "in_progress", "completed"])
          .gte("start_at", new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString())
          .order("start_at")
      ).data ?? [],
  });
}

export function useChallenge() {
  const { coupleId } = useCouple();
  return useQuery({
    queryKey: ["challenge", coupleId],
    queryFn: async () => {
      const sb = supabaseBrowser();
      const { data: c } = await sb
        .from("challenges")
        .select("id, start_on, status, challenge_templates(title, days, daily_prompt, blurb)")
        .in("status", ["active", "completed"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const [{ data: days }, { data: badges }, { data: templates }] = await Promise.all([
        c
          ? sb
              .from("challenge_days")
              .select("day, done_by_a, done_by_b")
              .eq("challenge_id", c.id)
              .order("day")
          : Promise.resolve({ data: [] }),
        sb.from("couple_badges").select("badge"),
        sb.from("challenge_templates").select("id, title, days, blurb").order("sort"),
      ]);
      return {
        challenge: c,
        days: days ?? [],
        badges: (badges ?? []).map((b) => b.badge),
        templates: templates ?? [],
      };
    },
  });
}

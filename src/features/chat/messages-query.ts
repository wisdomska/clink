import { infiniteQueryOptions } from "@tanstack/react-query";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Message } from "./types";

export const MESSAGES_PAGE = 40;

/**
 * The chat's newest messages, a page at a time. Shared by the chat (use-chat)
 * and the quiet preload from Us (useWarmChat), so both fill the same cache.
 */
export function messagesQuery(coupleId: string) {
  return infiniteQueryOptions({
    queryKey: ["messages", coupleId],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }): Promise<Message[]> => {
      let req = supabaseBrowser()
        .from("messages")
        .select("*")
        .eq("couple_id", coupleId)
        .order("sent_at", { ascending: false })
        .limit(MESSAGES_PAGE);
      if (pageParam) req = req.lt("sent_at", pageParam);
      const { data, error } = await req;
      if (error) throw error;
      return (data ?? []) as Message[];
    },
    getNextPageParam: (last: Message[]) =>
      last.length === MESSAGES_PAGE ? last[last.length - 1]!.sent_at : undefined,
    staleTime: Infinity,
  });
}

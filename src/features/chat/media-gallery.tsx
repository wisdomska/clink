"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Heart, Play } from "@phosphor-icons/react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useCouple } from "@/features/couple/context";
import { PageBar } from "@/components/clink/page-bar";

const PAGE = 60;
type Tile = { id: string; kind: string; created_at: string; is_favourite: boolean };

/**
 * Every photo and video you've shared in chat, by month (WhatsApp's Media tab).
 * Keyset pages of 60 (created_at, id) load as you scroll, so it never grows unbounded.
 */
export function MediaGallery() {
  const { coupleId } = useCouple();
  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage, isError } =
    useInfiniteQuery({
      queryKey: ["gallery", coupleId],
      initialPageParam: null as { at: string; id: string } | null,
      queryFn: async ({ pageParam }): Promise<Tile[]> => {
        let req = supabaseBrowser()
          .from("media")
          .select("id, kind, created_at, is_favourite")
          .eq("couple_id", coupleId)
          .in("kind", ["image", "video"])
          .eq("is_sensitive", false)
          .eq("status", "ready")
          .is("deleted_at", null)
          .not("storage_path", "like", "avatars/%")
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(PAGE);
        if (pageParam)
          req = req.or(
            `created_at.lt."${pageParam.at}",and(created_at.eq."${pageParam.at}",id.lt.${pageParam.id})`,
          );
        const { data, error } = await req;
        if (error) throw error;
        return data ?? [];
      },
      getNextPageParam: (last) => {
        const end = last[last.length - 1];
        return last.length === PAGE && end ? { at: end.created_at, id: end.id } : undefined;
      },
    });
  const items = data?.pages.flat() ?? [];
  const months = new Map<string, Tile[]>();
  items.forEach((m) => {
    const k = new Date(m.created_at).toLocaleDateString([], { month: "long", year: "numeric" });
    months.set(k, [...(months.get(k) ?? []), m]);
  });

  // Load the next page when the sentinel scrolls into view.
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNextPage) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !isFetchingNextPage) void fetchNextPage();
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <main className="an-screen mx-auto flex w-full max-w-[900px] flex-col gap-4 px-4 pt-[var(--screen-pt)] pb-8 [--screen-pt:calc(env(safe-area-inset-top)+8px)] md:[--screen-pt:2rem]">
      <PageBar title="Photos and videos" back="/chat" />
      {isLoading ? (
        <div className="grid grid-cols-3 gap-1 md:grid-cols-5">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="an-skel bg-s2 rounded-thumb aspect-square" />
          ))}
        </div>
      ) : isError && !items.length ? (
        <p className="text-muted" role="alert">
          Couldn&apos;t load your photos. Check your connection and try again.
        </p>
      ) : !items.length ? (
        <p className="text-muted">
          Nothing shared yet. Photos and videos you send in chat land here.
        </p>
      ) : (
        [...months.entries()].map(([month, items]) => (
          <section key={month} aria-label={month} className="flex flex-col gap-2">
            <h2 className="text-muted m-0 text-sm font-semibold">{month}</h2>
            <div className="grid grid-cols-3 gap-1 md:grid-cols-5">
              {items.map((m) => (
                <Link
                  key={m.id}
                  href={`/chat/media/${m.id}`}
                  aria-label={m.kind === "video" ? "Video" : "Photo"}
                  className="stripe rounded-thumb relative block aspect-square overflow-hidden"
                >
                  {m.kind === "video" ? (
                    <>
                      <video
                        src={`/api/media/${m.id}/view`}
                        preload="metadata"
                        muted
                        className="h-full w-full object-cover"
                      />
                      <Play
                        size={20}
                        weight="fill"
                        className="absolute right-1.5 bottom-1.5 text-white drop-shadow"
                        aria-hidden
                      />
                    </>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/media/${m.id}/view`}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  )}
                  {m.is_favourite && (
                    <Heart
                      size={16}
                      weight="fill"
                      className="text-accent absolute top-1.5 right-1.5 drop-shadow"
                      aria-hidden
                    />
                  )}
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
      {hasNextPage && (
        <div ref={sentinel} className="flex flex-col gap-2">
          {isFetchingNextPage && (
            <div
              role="status"
              aria-label="Loading more photos"
              className="grid grid-cols-3 gap-1 md:grid-cols-5"
            >
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="an-skel bg-s2 rounded-thumb aspect-square" />
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
            className="text-muted hover:text-text h-11 cursor-pointer self-center border-0 bg-transparent text-sm font-medium"
          >
            {isFetchingNextPage ? "Loading" : "Load older"}
          </button>
        </div>
      )}
    </main>
  );
}

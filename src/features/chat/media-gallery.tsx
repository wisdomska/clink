"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Heart, Play } from "@phosphor-icons/react";
import { IconButton } from "@/components/ui/button";
import { Display } from "@/components/ui/heading";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useCouple } from "@/features/couple/context";

/** Every photo and video you've shared in chat, by month (WhatsApp's Media tab). */
export function MediaGallery() {
  const router = useRouter();
  const { coupleId } = useCouple();
  const { data, isLoading } = useQuery({
    queryKey: ["gallery", coupleId],
    queryFn: async () => {
      const { data } = await supabaseBrowser()
        .from("media")
        .select("id, kind, created_at, is_favourite")
        .in("kind", ["image", "video"])
        .eq("is_sensitive", false)
        .eq("status", "ready")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(600);
      return data ?? [];
    },
  });
  const months = new Map<string, NonNullable<typeof data>>();
  (data ?? []).forEach((m) => {
    const k = new Date(m.created_at).toLocaleDateString([], { month: "long", year: "numeric" });
    months.set(k, [...(months.get(k) ?? []), m]);
  });

  return (
    <main className="an-screen mx-auto flex w-full max-w-[900px] flex-col gap-4 px-4 pt-[calc(env(safe-area-inset-top)+8px)] pb-8 md:pt-8">
      <div className="flex items-center gap-3">
        <IconButton label="Back" onClick={() => router.push("/chat")}>
          <ArrowLeft size={20} />
        </IconButton>
        <Display size={28}>
          Photos and <em>videos</em>
        </Display>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-3 gap-1 md:grid-cols-5">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="an-skel bg-s2 aspect-square rounded-lg" />
          ))}
        </div>
      ) : !data?.length ? (
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
                  className="stripe relative block aspect-square overflow-hidden rounded-lg"
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
    </main>
  );
}

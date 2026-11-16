"use client";
import { useEffect, useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { MusicNotes, Plus, SkipForward, Trash } from "@phosphor-icons/react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useCouple } from "@/features/couple/context";
import { Button, IconButton } from "@/components/ui/button";
import { Lead, PartnerMark, Skeleton } from "@/components/ui/heading";
import { FieldError } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { SyncedPlayer } from "./watch-room";
import { SyncedSpotify } from "./spotify-player";
import { subscribeAuthed } from "@/lib/realtime";
import { BrandLogo } from "@/components/clink/brand-logo";
import type { Database } from "@/types/database";
import {
  SERVICE_LABEL,
  UNSUPPORTED_LINK,
  detectService,
  embedHeight,
  embedUrl,
  isSpotifySyncable,
  parseMusicLink,
  spotifyUri,
  type MusicService,
} from "./music-link";
import { PAGE, editPaged, flatPaged, nextOffset } from "./paged";
import { PageBar } from "@/components/clink/page-bar";

type Row = Database["public"]["Tables"]["listen_queue"]["Row"];
/** `service` comes from migration 20261116000100; older rows default to youtube. */
type QueueItem = Row & { service?: MusicService | null; pending?: boolean };
const svcOf = (q: QueueItem): MusicService => q.service ?? "youtube";

/** The official mark for the detected service, or a neutral note when empty or unknown. */
function ServiceMark({ service }: { service: MusicService | null }) {
  return (
    <span className="flex h-8 w-8 flex-none items-center justify-center">
      {service ? (
        <BrandLogo brand={service} size={32} />
      ) : (
        <span
          aria-hidden
          className="bg-s2 border-line text-muted flex h-8 w-8 items-center justify-center rounded-full border"
        >
          <MusicNotes size={16} />
        </span>
      )}
      <span className="sr-only" aria-live="polite">
        {service ? `${SERVICE_LABEL[service]} link` : ""}
      </span>
    </span>
  );
}

/** Spotify and Apple Music: their own official embed players, without sync. */
function EmbedPlayer({ item }: { item: QueueItem }) {
  const svc = svcOf(item);
  if (svc === "youtube") return null;
  const src = embedUrl(svc, item.video_id);
  if (!src) return <FieldError>{UNSUPPORTED_LINK}</FieldError>;
  const title = `${SERVICE_LABEL[svc]} player: ${item.title ?? "song"}`;
  return svc === "spotify" ? (
    <iframe
      title={title}
      src={src}
      height={embedHeight(svc, item.video_id)}
      className="rounded-card border-line w-full border-0"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy"
    />
  ) : (
    <iframe
      title={title}
      src={src}
      height={embedHeight(svc, item.video_id)}
      className="rounded-card w-full overflow-hidden border-0"
      allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write"
      sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
      loading="lazy"
    />
  );
}

function RowSkeleton() {
  return (
    <li aria-hidden className="flex items-center gap-3 px-4 py-3">
      <Skeleton className="h-2.5 w-2.5 rounded-full" />
      <Skeleton className="h-4 flex-1 rounded-md" />
      <Skeleton className="h-6 w-6 rounded-full" />
    </li>
  );
}

/** TOG-02 listen together: shared queue of YouTube, Spotify and Apple Music links. */
export function ListenTogether() {
  const { me, partner, coupleId } = useCouple();
  const qc = useQueryClient();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const key = ["listen", coupleId];
  const q = useInfiniteQuery({
    queryKey: key,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) =>
      ((
        await supabaseBrowser()
          .from("listen_queue")
          .select("*")
          .is("played_at", null)
          .order("position")
          .order("created_at")
          .range(pageParam, pageParam + PAGE - 1)
      ).data ?? []) as QueueItem[],
    getNextPageParam: nextOffset,
  });
  const queue = flatPaged(q.data);
  useEffect(() => {
    const sb = supabaseBrowser();
    const ch = sb
      .channel(`listen:${coupleId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "listen_queue", filter: `couple_id=eq.${coupleId}` },
        () => qc.invalidateQueries({ queryKey: key }),
      );
    return subscribeAuthed(
      ch,
      (st) => st === "SUBSCRIBED" && void qc.invalidateQueries({ queryKey: key }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupleId]);
  const now = queue[0];
  const detected = detectService(url);

  async function add() {
    setError(null);
    const link = parseMusicLink(url);
    if (!link) return setError(UNSUPPORTED_LINK);
    const pasted = url;
    setUrl("");
    // Optimistic: show it straight away, reconcile with the server row.
    const temp: QueueItem = {
      id: `pending-${crypto.randomUUID()}`,
      couple_id: coupleId,
      added_by: me.id,
      video_id: link.ref,
      service: link.service,
      title: null,
      position: Number.MAX_SAFE_INTEGER,
      played_at: null,
      created_at: new Date().toISOString(),
      pending: true,
    };
    const fullyLoaded = !q.hasNextPage;
    const prev = await editPaged<QueueItem>(qc, key, (items, i, n) =>
      fullyLoaded && i === n - 1 ? [...items, temp] : items,
    );
    if (!prev) qc.setQueryData(key, { pages: [[temp]], pageParams: [0] });
    if (!fullyLoaded) toast("Added to the queue.");
    const r = await fetch("/api/listen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: pasted }),
    }).catch(() => null);
    if (!r || !r.ok) {
      const msg = r ? ((await r.json().catch(() => null))?.message as string | undefined) : null;
      await editPaged<QueueItem>(qc, key, (items) => items.filter((x) => x.id !== temp.id));
      setUrl(pasted);
      setError(msg ?? "Couldn't add that. Try again.");
      return;
    }
    const { item } = (await r.json()) as { item?: QueueItem };
    if (item) {
      await editPaged<QueueItem>(qc, key, (items) =>
        items.map((x) => (x.id === temp.id ? item : x)),
      );
    }
    void qc.invalidateQueries({ queryKey: key });
  }

  async function drop(id: string, change: "played" | "remove") {
    if (id.startsWith("pending-")) return;
    const prev = await editPaged<QueueItem>(qc, key, (items) => items.filter((x) => x.id !== id));
    const sb = supabaseBrowser().from("listen_queue");
    const { error } =
      change === "played"
        ? await sb.update({ played_at: new Date().toISOString() }).eq("id", id)
        : await sb.delete().eq("id", id);
    if (error) {
      if (prev) qc.setQueryData(key, prev);
      toast.err(change === "played" ? "Couldn't skip that." : "Couldn't remove that.");
    }
    void qc.invalidateQueries({ queryKey: key });
  }

  const nowSvc = now ? svcOf(now) : null;

  return (
    <div className="screen an-screen flex max-w-[760px] flex-col gap-5">
      <PageBar title="Listen together" back="/plans" />
      <Lead>
        One queue, two pairs of headphones. Either of you can add a song from YouTube, Spotify or
        Apple Music.
      </Lead>
      {q.isPending ? (
        <Skeleton className="h-[152px] w-full" />
      ) : now ? (
        <>
          <div className="flex items-center gap-2">
            <BrandLogo brand={svcOf(now)} size={20} />
            <div className="text-muted min-w-0 flex-1 truncate text-sm font-medium">
              Now playing:{" "}
              <span className="text-text">
                {now.title ?? `a ${SERVICE_LABEL[svcOf(now)]} link`}
              </span>
            </div>
            {nowSvc !== "youtube" && !now.pending && (
              <Button variant="ghost" size="sm" onClick={() => void drop(now.id, "played")}>
                <SkipForward size={16} aria-hidden />
                Next
              </Button>
            )}
          </div>
          {now.pending ? (
            <Skeleton className="h-[152px] w-full" />
          ) : nowSvc === "youtube" ? (
            <SyncedPlayer
              key={now.id}
              sessionId={`listen-${now.id}`}
              videoId={now.video_id}
              leader={now.added_by === me.id}
              audioOnly
              onEnded={() => void drop(now.id, "played")}
            />
          ) : nowSvc === "spotify" && isSpotifySyncable(now.video_id) ? (
            <>
              <SyncedSpotify
                key={now.id}
                sessionId={`listen-${now.id}`}
                uri={spotifyUri(now.video_id)!}
                title={`Spotify player: ${now.title ?? "song"}`}
                height={embedHeight("spotify", now.video_id)}
                leader={now.added_by === me.id}
                onEnded={() => void drop(now.id, "played")}
                fallback={<EmbedPlayer item={now} />}
              />
              <p className="text-faint m-0 text-xs">
                Play, pause and skipping ahead stay in step on both devices. For full songs, each of
                you needs to be signed in to Spotify in this browser. Otherwise Spotify plays a
                30-second preview.
              </p>
            </>
          ) : (
            <>
              <EmbedPlayer key={now.id} item={now} />
              <p className="text-faint m-0 text-xs">
                {nowSvc === "apple_music"
                  ? "Apple Music can't be synced, so it plays on each device separately. Press play together, then tap Next when it ends."
                  : "Albums and playlists can't be synced, so they play on each device separately. For full songs, each of you needs to be signed in to Spotify in this browser."}
              </p>
            </>
          )}
        </>
      ) : (
        <div className="rounded-card border-line text-muted border border-dashed p-5 text-base">
          The queue is empty. Add the song that&apos;s stuck in your head.
        </div>
      )}
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <ServiceMark service={detected} />
        <input
          aria-label="Music link"
          placeholder="Paste a YouTube, Spotify or Apple Music link"
          value={url}
          inputMode="url"
          autoComplete="off"
          onChange={(e) => {
            setUrl(e.target.value);
            if (error) setError(null);
          }}
          aria-invalid={error ? true : undefined}
          className="rounded-input border-line bg-s2 text-text focus:border-accent h-[52px] min-w-0 flex-1 border px-4 text-base outline-none"
        />
        <Button type="submit" size="lg" variant="secondary" aria-label="Add to queue">
          <Plus size={20} aria-hidden />
        </Button>
      </form>
      <FieldError>{error}</FieldError>
      {(queue.length > 1 || q.isFetchingNextPage) && (
        <ol
          aria-label="Up next"
          className="rounded-card border-line bg-s1 divide-line m-0 flex list-none flex-col divide-y overflow-hidden border p-0"
        >
          {queue.slice(1).map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 px-4 py-2"
              aria-busy={item.pending || undefined}
            >
              <PartnerMark who={item.added_by === me.id ? me.role : partner.role} />
              <BrandLogo brand={svcOf(item)} size={20} />
              <span className="flex-1 truncate">
                {item.title ?? `${SERVICE_LABEL[svcOf(item)]} link`}
              </span>
              <IconButton
                label="Remove from queue"
                dim={44}
                disabled={item.pending}
                onClick={() => void drop(item.id, "remove")}
              >
                <Trash size={18} />
              </IconButton>
            </li>
          ))}
          {q.isFetchingNextPage && (
            <>
              <RowSkeleton />
              <RowSkeleton />
              <RowSkeleton />
            </>
          )}
        </ol>
      )}
      {q.hasNextPage && !q.isFetchingNextPage && (
        <Button
          variant="ghost"
          size="sm"
          className="self-center"
          onClick={() => void q.fetchNextPage()}
        >
          Load more
        </Button>
      )}
    </div>
  );
}

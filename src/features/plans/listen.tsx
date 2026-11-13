"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash } from "@phosphor-icons/react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useCouple } from "@/features/couple/context";
import { Button, IconButton } from "@/components/ui/button";
import { Display, Lead, PartnerMark } from "@/components/ui/heading";
import { FieldError } from "@/components/ui/field";
import { youtubeId } from "@/lib/youtube";
import { SyncedPlayer } from "./watch-room";
import { subscribeAuthed } from "@/lib/realtime";

/** TOG-02 listen together: shared YouTube audio queue, either partner can add, synced playback. */
export function ListenTogether() {
  const router = useRouter();
  const { me, partner, coupleId } = useCouple();
  const qc = useQueryClient();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const key = ["listen", coupleId];
  const { data: queue = [] } = useQuery({
    queryKey: key,
    queryFn: async () => (await supabaseBrowser().from("listen_queue").select("*").is("played_at", null).order("position").order("created_at")).data ?? [],
  });
  useEffect(() => {
    const sb = supabaseBrowser();
    const ch = sb.channel(`listen:${coupleId}`).on("postgres_changes", { event: "*", schema: "public", table: "listen_queue", filter: `couple_id=eq.${coupleId}` }, () => qc.invalidateQueries({ queryKey: key }));
    return subscribeAuthed(ch, (st) => st === "SUBSCRIBED" && void qc.invalidateQueries({ queryKey: key }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupleId]);
  const now = queue[0];

  async function add() {
    setError(null);
    if (!youtubeId(url)) return setError("Paste a YouTube link.");
    const r = await fetch("/api/listen", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
    if (!r.ok) return setError((await r.json()).message);
    setUrl("");
    void qc.invalidateQueries({ queryKey: key });
  }

  return (
    <div className="screen an-screen flex max-w-[760px] flex-col gap-5">
      <IconButton label="Back" onClick={() => router.push("/plans")}>
        <ArrowLeft size={20} />
      </IconButton>
      <Display size={48}>
        Listen <em>together</em>
      </Display>
      <Lead>One queue, two pairs of headphones. Either of you can add a song.</Lead>
      {now ? (
        <>
          <div className="text-sm font-medium text-muted">Now playing: <span className="text-text">{now.title ?? "a song"}</span></div>
          <SyncedPlayer
            key={now.id}
            sessionId={`listen-${now.id}`}
            videoId={now.video_id}
            leader={now.added_by === me.id}
            audioOnly
            onEnded={async () => {
              await supabaseBrowser().from("listen_queue").update({ played_at: new Date().toISOString() }).eq("id", now.id);
              void qc.invalidateQueries({ queryKey: key });
            }}
          />
        </>
      ) : (
        <div className="rounded-card border border-dashed border-line p-5 text-base text-muted">The queue is empty. Add the song that&apos;s stuck in your head.</div>
      )}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <input aria-label="YouTube link" placeholder="Paste a YouTube link" value={url} onChange={(e) => setUrl(e.target.value)} className="h-[52px] min-w-0 flex-1 rounded-input border border-line bg-s2 px-4 text-base text-text outline-none focus:border-accent" />
        <Button type="submit" size="lg" variant="secondary" aria-label="Add to queue">
          <Plus size={20} aria-hidden />
        </Button>
      </form>
      <FieldError>{error}</FieldError>
      <ol className="m-0 flex list-none flex-col gap-2 p-0">
        {queue.slice(1).map((q) => (
          <li key={q.id} className="flex items-center gap-3 rounded-input border border-line bg-s1 px-4 py-3">
            <PartnerMark who={q.added_by === me.id ? me.role : partner.role} />
            <span className="flex-1 truncate">{q.title ?? q.video_id}</span>
            <IconButton label="Remove from queue" dim={40} onClick={async () => { await supabaseBrowser().from("listen_queue").delete().eq("id", q.id); void qc.invalidateQueries({ queryKey: key }); }}>
              <Trash size={18} />
            </IconButton>
          </li>
        ))}
      </ol>
    </div>
  );
}

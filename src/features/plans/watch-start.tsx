"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, TelevisionSimple } from "@phosphor-icons/react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useCouple } from "@/features/couple/context";
import { Button, IconButton } from "@/components/ui/button";
import { Display, Lead } from "@/components/ui/heading";
import { Input, Label, FieldError } from "@/components/ui/field";

export function WatchStart() {
  const router = useRouter();
  const { coupleId } = useCouple();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { data: recent = [] } = useQuery({
    queryKey: ["watch", coupleId],
    queryFn: async () =>
      (
        await supabaseBrowser()
          .from("watch_sessions")
          .select("id, title, video_id, ended_at, created_at")
          .eq("kind", "watch")
          .order("created_at", { ascending: false })
          .limit(6)
      ).data ?? [],
  });
  const [now] = useState(() => Date.now());
  const live = recent.find(
    (r) => !r.ended_at && now - new Date(r.created_at).getTime() < 6 * 3600 * 1000,
  );
  return (
    <div className="screen an-screen flex max-w-[640px] flex-col gap-5">
      <IconButton label="Back" onClick={() => router.push("/plans")}>
        <ArrowLeft size={20} />
      </IconButton>
      <Display size={48}>
        Watch <em>party</em>
      </Display>
      <Lead>Paste a YouTube link. Play, pause and skip stay in step for both of you.</Lead>
      {live && (
        <button
          type="button"
          onClick={() => router.push(`/plans/watch/${live.id}`)}
          className="press rounded-card border-accent bg-s1 text-text flex cursor-pointer items-center gap-3 border-2 px-4 py-3.5 text-left"
        >
          <TelevisionSimple size={24} className="text-accent" aria-hidden />
          <span className="flex-1 text-base font-bold">Rejoin {live.title ?? "the party"}</span>
        </button>
      )}
      <form
        className="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          const r = await fetch("/api/watch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
          });
          const d = await r.json();
          if (!r.ok) return setError(d.message);
          router.push(`/plans/watch/${d.id}`);
        }}
      >
        <div>
          <Label htmlFor="yt">YouTube link</Label>
          <Input
            id="yt"
            inputMode="url"
            placeholder="https://youtu.be/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        <FieldError>{error}</FieldError>
        <Button type="submit" disabled={!url.trim()}>
          Start the party
        </Button>
      </form>
    </div>
  );
}

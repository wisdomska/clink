"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Heart, DownloadSimple, Trash } from "@phosphor-icons/react";
import { IconButton } from "@/components/ui/button";
import { useCouple } from "@/features/couple/context";
import { toast } from "@/components/ui/toast";
import { VoicePlayer } from "./voice-player";

export function MediaViewer({
  media,
}: {
  media: {
    id: string;
    kind: string;
    mime: string;
    duration_s: number | null;
    waveform: unknown;
    is_favourite: boolean;
    owner_id: string;
    created_at: string;
    deleted_at: string | null;
  };
}) {
  const router = useRouter();
  const { me } = useCouple();
  const [fav, setFav] = useState(media.is_favourite);
  const src = `/api/media/${media.id}/view`;
  const close = () => (window.history.length > 1 ? router.back() : router.push("/chat"));

  return (
    <div
      className="an-fade bg-app fixed inset-0 z-50 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Media viewer"
    >
      <div className="flex flex-none items-center gap-2 px-4 pt-[calc(env(safe-area-inset-top)+8px)] pb-2">
        <IconButton label="Close" onClick={close}>
          <X size={20} />
        </IconButton>
        <div className="mono text-faint flex-1 text-xs">
          {new Date(media.created_at).toLocaleString("en-GB", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
        {media.kind !== "audio" && (
          <IconButton
            label={fav ? "Remove from memory wall" : "Add to memory wall"}
            tone="surface"
            onClick={async () => {
              const next = !fav;
              setFav(next);
              const r = await fetch(`/api/media/${media.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ favourite: next }),
              });
              if (!r.ok) setFav(!next);
              else toast(next ? "Pinned to the memory wall." : "Taken off the wall.");
            }}
          >
            <Heart
              size={20}
              weight={fav ? "fill" : "regular"}
              className={fav ? "text-accent" : ""}
            />
          </IconButton>
        )}
        <a
          href={src}
          download
          aria-label="Save"
          className="press border-line bg-s1 text-text hover:text-text flex h-11 w-11 items-center justify-center rounded-full border"
        >
          <DownloadSimple size={20} />
        </a>
        {media.owner_id === me.id && (
          <IconButton
            label="Unsend"
            tone="surface"
            onClick={async () => {
              await fetch(`/api/media/${media.id}`, { method: "DELETE" });
              toast("Unsent.");
              close();
            }}
          >
            <Trash size={20} />
          </IconButton>
        )}
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-4">
        {media.deleted_at ? (
          <p className="text-muted">Removed by sender</p>
        ) : media.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt="Shared photo"
            className="rounded-thumb max-h-full max-w-full object-contain"
          />
        ) : media.kind === "video" ? (
          <video
            src={src}
            controls
            playsInline
            autoPlay
            className="rounded-thumb max-h-full max-w-full"
          />
        ) : (
          <VoicePlayer
            src={src}
            duration={Number(media.duration_s ?? 0)}
            waveform={(media.waveform as number[] | null) ?? null}
            mine={media.owner_id === me.id}
          />
        )}
      </div>
    </div>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { X, EyeSlash, Trash } from "@phosphor-icons/react";
import { useCouple } from "@/features/couple/context";
import { IconButton, Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { formatClock } from "@/lib/time";

/**
 * Sensitive media viewer. Bytes are fetched once (no-store) into an object URL
 * that is revoked on close; tab switch or app blur hides the media and is logged
 * (SAF-07). View once is consumed when closed. Never claims to block screenshots.
 */
export function SensitiveViewer({
  id,
  mine,
  kind,
  retention,
}: {
  id: string;
  mine: boolean;
  kind: string;
  retention: string;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const { me } = useCouple();
  const [url, setUrl] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  async function reveal() {
    const r = await fetch(`/api/media/${id}/view`, { cache: "no-store" });
    if (!r.ok) {
      setError((await r.json().catch(() => ({}))).message ?? "This is gone.");
      return;
    }
    const u = URL.createObjectURL(await r.blob());
    urlRef.current = u;
    setUrl(u);
    setRevealed(true);
  }

  function close() {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setUrl(null);
    if (retention === "once" && !mine && revealed)
      void fetch(`/api/media/${id}/viewed`, { method: "POST" });
    void qc.invalidateQueries({ queryKey: ["vault"] });
    router.replace("/dark/vault");
  }

  useEffect(() => {
    const hide = (event: "blur" | "hidden") => {
      if (!urlRef.current) return;
      setHidden(true);
      void fetch("/api/dark/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId: id, event }),
      });
    };
    const onBlur = () => hide("blur");
    const onVis = () => document.visibilityState === "hidden" && hide("hidden");
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVis);
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, [id]);

  return (
    <div
      className="bg-app fixed inset-0 z-50 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Private media"
    >
      <div className="flex flex-none items-center gap-2 px-4 pt-[calc(env(safe-area-inset-top)+8px)] pb-2">
        <IconButton label="Close" onClick={close}>
          <X size={20} />
        </IconButton>
        <div className="mono text-faint flex-1 text-xs">
          {retention === "once" ? "View once" : retention === "vault" ? "Kept in vault" : "Expires"}
        </div>
        {mine && (
          <Button
            variant="danger-outline"
            size="xs"
            onClick={async () => {
              await fetch(`/api/media/${id}`, { method: "DELETE" });
              toast("Unsent. It's gone for both of you.");
              close();
            }}
          >
            <Trash size={16} aria-hidden /> Unsend
          </Button>
        )}
      </div>
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center p-4"
        onContextMenu={(e) => e.preventDefault()}
      >
        {error ? (
          <p className="text-muted text-center text-base">{error}</p>
        ) : !revealed ? (
          <button
            type="button"
            onClick={reveal}
            className="rounded-card border-line bg-s2 text-text flex h-full max-h-[70dvh] w-full max-w-[420px] cursor-pointer flex-col items-center justify-center gap-2 border"
          >
            <EyeSlash size={28} aria-hidden />
            <span className="text-base font-medium">Tap to reveal</span>
            {retention === "once" && !mine && (
              <span className="text-muted text-sm">Opens once. Gone when you close it.</span>
            )}
          </button>
        ) : (
          url && (
            <div
              className="an-fade relative max-h-full max-w-full select-none"
              style={{ filter: hidden ? "blur(28px)" : "none", transition: "filter 200ms" }}
            >
              {kind === "video" ? (
                <video
                  src={url}
                  autoPlay
                  playsInline
                  controls
                  controlsList="nodownload noplaybackrate"
                  disablePictureInPicture
                  className="rounded-thumb max-h-[78dvh] max-w-full"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={url}
                  alt="Private photo"
                  draggable={false}
                  className="rounded-thumb max-h-[78dvh] max-w-full"
                />
              )}
              {kind === "video" && (
                <div
                  aria-hidden
                  className="mono pointer-events-none absolute bottom-3 left-3 text-[11px] text-[rgba(251,243,246,.55)]"
                >
                  {me.name.toUpperCase()} · {formatClock(new Date(), me.timezone)}
                </div>
              )}
              {hidden && (
                <button
                  type="button"
                  onClick={() => setHidden(false)}
                  className="text-text absolute inset-0 flex cursor-pointer items-center justify-center bg-transparent text-base font-medium"
                >
                  Hidden while you were away. Tap to show.
                </button>
              )}
            </div>
          )
        )}
      </div>
      <p className="text-faint m-0 px-6 pb-[calc(env(safe-area-inset-bottom)+16px)] text-center text-xs">
        They can still screenshot. Only send what feels right.
      </p>
    </div>
  );
}

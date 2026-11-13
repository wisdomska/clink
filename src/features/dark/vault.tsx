"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, EyeSlash, Plus } from "@phosphor-icons/react";
import { useState } from "react";
import { IconButton, Button } from "@/components/ui/button";
import { darkFetch } from "./api";
import { SendSheet } from "./send-sheet";

interface Item {
  id: string;
  mine: boolean;
  kind: string;
  retention: string;
  expiresAt: string | null;
  at: string;
  removed: boolean;
  duration: number | null;
}

const veil = (i: number) => `radial-gradient(circle at ${20 + i * 7}% ${30 + ((i * 13) % 50)}%, rgba(255,90,60,.55), transparent 45%), radial-gradient(circle at ${70 - i * 4}% 75%, rgba(244,240,245,.18), transparent 50%), #211E25`;

/** DARK-08 vault: empty, blurred grid, removed by sender. Revealing opens the protected viewer. */
export function VaultScreen() {
  const router = useRouter();
  const [send, setSend] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ["vault"], queryFn: () => darkFetch<{ items: Item[] }>("/api/dark/vault") });
  const items = data?.items ?? [];
  return (
    <main className="an-screen mx-auto flex min-h-dvh max-w-[900px] flex-col gap-4 px-4 pt-[calc(env(safe-area-inset-top)+8px)] pb-8 md:pt-8">
      <div className="flex items-center gap-3">
        <IconButton label="Back" onClick={() => router.push("/dark/home")}>
          <ArrowLeft size={20} />
        </IconButton>
        <h1 className="display m-0 flex-1 text-[36px]">Vault</h1>
        <Button size="sm" onClick={() => setSend(true)}>
          <Plus size={18} aria-hidden /> Send
        </Button>
      </div>
      <p className="-mt-2 mb-0 text-base leading-normal text-muted">Only what you both chose to keep. The sender can unsend any time.</p>
      {isLoading ? (
        <div className="grid grid-cols-3 gap-1.5 md:grid-cols-4">{Array.from({ length: 6 }, (_, i) => <div key={i} className="an-skel aspect-[3/4] rounded-thumb bg-s2" />)}</div>
      ) : items.length ? (
        <div className="grid grid-cols-3 gap-1.5 md:grid-cols-4 lg:grid-cols-5">
          {items.map((v, i) =>
            v.removed ? (
              <div key={v.id} className="flex aspect-[3/4] items-center justify-center rounded-thumb border-[1.5px] border-dashed border-line p-2 text-center text-xs font-medium text-faint">
                Removed by sender
              </div>
            ) : (
              <Link key={v.id} href={`/dark/view/${v.id}`} aria-label={`${v.kind === "video" ? "Video" : "Photo"} from ${v.mine ? "you" : "them"}. Tap to reveal`} className="press an-rise relative block aspect-[3/4] overflow-hidden rounded-thumb text-text hover:text-text" style={{ ["--i" as string]: Math.min(i, 12) }}>
                <span aria-hidden className="absolute -inset-4" style={{ background: veil(i), filter: "blur(14px)" }} />
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-1" style={{ background: "rgba(15,14,17,.35)" }}>
                  <EyeSlash size={20} aria-hidden />
                  <span className="text-[11px] font-medium">Tap to reveal</span>
                </span>
                <span className="mono absolute top-1.5 right-1.5 text-[10px] text-muted">{v.kind === "video" ? `video${v.duration ? ` 0:${String(Math.round(v.duration)).padStart(2, "0")}` : ""}` : "photo"}</span>
                <span className="mono absolute bottom-1.5 left-1.5 text-[10px] text-muted">{v.retention === "once" ? "ONCE" : v.retention === "vault" ? (v.mine ? "YOURS" : "KEPT") : "EXPIRES"}</span>
              </Link>
            ),
          )}
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3.5 text-center">
          <div aria-hidden className="relative h-20 w-[120px] overflow-hidden rounded-thumb border border-line bg-s2">
            <span className="absolute inset-x-0 bottom-0 h-3.5" style={{ background: "repeating-linear-gradient(90deg,rgba(255,90,60,.5) 0 2px,#211E25 2px 5px)" }} />
          </div>
          <div className="display text-[28px] leading-[1.05]">Nothing kept. Yet.</div>
          <p className="m-0 text-base leading-normal text-muted">When you send with Keep in vault, it lands here for both of you.</p>
        </div>
      )}
      <SendSheet open={send} onClose={() => setSend(false)} />
    </main>
  );
}

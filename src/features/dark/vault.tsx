"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, EyeSlash, Plus, Vault } from "@phosphor-icons/react";
import { useState } from "react";
import { IconButton, Button } from "@/components/ui/button";
import { LoadMore, flatItems, useCursorList, useScrollRestore } from "@/features/plans/infinite";
import type { CursorPage } from "@/features/plans/cursor";
import { darkFetch } from "./api";
import { SendSheet } from "./send-sheet";

export const vaultListKey = ["vault", "list"] as const;

export interface VaultItem {
  id: string;
  mine: boolean;
  kind: string;
  retention: string;
  expiresAt: string | null;
  at: string;
  removed: boolean;
  duration: number | null;
}

/** Blurred tiles while a page loads, same grid and aspect as the real ones. */
function VaultSkeleton({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} aria-hidden className="an-skel rounded-thumb bg-s2 aspect-[3/4]" />
      ))}
    </>
  );
}

/** DARK-08 vault: empty, blurred grid, removed by sender. Revealing opens the protected viewer. */
export function VaultScreen() {
  const router = useRouter();
  const [send, setSend] = useState(false);
  const q = useCursorList<VaultItem>({
    queryKey: vaultListKey,
    fetchPage: (cursor) =>
      darkFetch<CursorPage<VaultItem>>(
        `/api/dark/vault${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`,
      ),
    staleTime: 15_000,
  });
  const items = flatItems(q.data);
  const isLoading = q.isPending;
  useScrollRestore("dark-vault", q.isSuccess);
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
      <p className="text-muted -mt-2 mb-0 text-base leading-normal">
        Only what you both chose to keep. The sender can unsend any time.
      </p>
      {isLoading ? (
        <div className="grid grid-cols-3 gap-1.5 md:grid-cols-4 lg:grid-cols-5">
          <VaultSkeleton />
        </div>
      ) : items.length ? (
        <>
          <div className="grid grid-cols-3 gap-1.5 md:grid-cols-4 lg:grid-cols-5">
            {items.map((v, i) =>
              v.removed ? (
                <div
                  key={v.id}
                  className="rounded-thumb border-line text-faint flex aspect-[3/4] items-center justify-center border-[1.5px] border-dashed p-2 text-center text-xs font-medium"
                >
                  Removed by sender
                </div>
              ) : (
                <Link
                  key={v.id}
                  href={`/dark/view/${v.id}`}
                  aria-label={`${v.kind === "video" ? "Video" : "Photo"} from ${v.mine ? "you" : "them"}. Tap to reveal`}
                  className="press an-rise rounded-thumb border-line bg-s2 text-text hover:text-text relative block aspect-[3/4] overflow-hidden border"
                  style={{ ["--i" as string]: Math.min(i % 20, 12) }}
                >
                  <span className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                    <EyeSlash size={20} aria-hidden />
                    <span className="text-[11px] font-medium">Tap to reveal</span>
                  </span>
                  <span className="mono text-muted absolute top-1.5 right-1.5 text-[10px]">
                    {v.kind === "video"
                      ? `video${v.duration ? ` 0:${String(Math.round(v.duration)).padStart(2, "0")}` : ""}`
                      : "photo"}
                  </span>
                  <span className="mono text-muted absolute bottom-1.5 left-1.5 text-[10px]">
                    {v.retention === "once"
                      ? "once"
                      : v.retention === "vault"
                        ? v.mine
                          ? "yours"
                          : "kept"
                        : "expires"}
                  </span>
                </Link>
              ),
            )}
            {q.isFetchingNextPage && <VaultSkeleton count={3} />}
          </div>
          <LoadMore query={q} />
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3.5 text-center">
          <div
            aria-hidden
            className="rounded-input border-line bg-s2 text-ember flex h-16 w-16 items-center justify-center border"
          >
            <Vault size={30} />
          </div>
          <div className="display text-[28px] leading-[1.05]">Nothing kept. Yet.</div>
          <p className="text-muted m-0 text-base leading-normal">
            When you send with Keep in vault, it lands here for both of you.
          </p>
          <Button size="sm" variant="ghost" onClick={() => setSend(true)}>
            <Plus size={18} aria-hidden /> Send something
          </Button>
        </div>
      )}
      <SendSheet open={send} onClose={() => setSend(false)} />
    </main>
  );
}

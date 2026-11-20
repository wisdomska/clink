"use client";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PushPin, PushPinSlash, ListBullets } from "@phosphor-icons/react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { subscribeAuthed } from "@/lib/realtime";
import { useCouple, useCoupleEvent } from "@/features/couple/context";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import { haptic } from "@/lib/feedback";
import { previewText } from "./bubbles";
import type { Message } from "./types";

export const MAX_PINS = 10;

type PinnedMessage = Pick<
  Message,
  "id" | "sender_id" | "type" | "body" | "sticker_id" | "media_ids" | "sent_at" | "removed_at"
>;
export interface Pin {
  message_id: string;
  pinned_by: string;
  pinned_at: string;
  message: PinnedMessage | null;
}

/** The couple's pinned messages (newest pin first), kept live, with optimistic pin/unpin. */
export function usePins() {
  const { coupleId, me, send } = useCouple();
  const qc = useQueryClient();
  const key = useMemo(() => ["pins", coupleId], [coupleId]);
  const q = useQuery({
    queryKey: key,
    staleTime: 60_000,
    queryFn: async (): Promise<Pin[]> => {
      const { data, error } = await supabaseBrowser()
        .from("message_pins")
        .select(
          "message_id, pinned_by, pinned_at, messages(id, sender_id, type, body, sticker_id, media_ids, sent_at, removed_at)",
        )
        .eq("couple_id", coupleId)
        .order("pinned_at", { ascending: false })
        .limit(MAX_PINS);
      if (error) throw error;
      return (data ?? []).map((p) => ({
        message_id: p.message_id,
        pinned_by: p.pinned_by,
        pinned_at: p.pinned_at,
        message: (p.messages as unknown as PinnedMessage | null) ?? null,
      }));
    },
  });

  useEffect(() => {
    const ch = supabaseBrowser()
      .channel(`pins:${coupleId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_pins", filter: `couple_id=eq.${coupleId}` },
        () => void qc.invalidateQueries({ queryKey: key }),
      );
    return subscribeAuthed(ch, () => undefined);
  }, [coupleId, key, qc]);
  // Deletes don't pass the couple filter on realtime, so they're announced here too.
  useCoupleEvent("chat.pins", () => void qc.invalidateQueries({ queryKey: key }));

  const pins = useMemo(
    () => (q.data ?? []).filter((p) => p.message && !p.message.removed_at),
    [q.data],
  );
  const pinned = useMemo(() => new Set(pins.map((p) => p.message_id)), [pins]);

  async function pin(m: PinnedMessage) {
    if (pinned.has(m.id)) return;
    if (pins.length >= MAX_PINS) {
      toast.err(`You can pin up to ${MAX_PINS} messages. Unpin one first.`);
      return;
    }
    // A refresh already on its way would land after this change and undo it.
    await qc.cancelQueries({ queryKey: key });
    const prev = qc.getQueryData<Pin[]>(key);
    qc.setQueryData<Pin[]>(key, (old) => [
      { message_id: m.id, pinned_by: me.id, pinned_at: new Date().toISOString(), message: m },
      ...(old ?? []),
    ]);
    haptic("select");
    const r = await fetch(`/api/messages/${m.id}/pin`, { method: "POST" });
    if (!r.ok) {
      qc.setQueryData(key, prev);
      toast.err((await r.json().catch(() => ({}))).message ?? "That didn't pin.");
      return;
    }
    send("chat.pins", {});
    void qc.invalidateQueries({ queryKey: key });
    toast("Pinned for you both.");
  }

  async function unpin(id: string) {
    await qc.cancelQueries({ queryKey: key });
    const prev = qc.getQueryData<Pin[]>(key);
    qc.setQueryData<Pin[]>(key, (old) => (old ?? []).filter((p) => p.message_id !== id));
    haptic("tap");
    const r = await fetch(`/api/messages/${id}/pin`, { method: "DELETE" });
    if (!r.ok) {
      qc.setQueryData(key, prev);
      toast.err("That didn't unpin. Try again.");
      return;
    }
    send("chat.pins", {});
    // Settle on what the server has now (realtime doesn't carry deletes here).
    void qc.invalidateQueries({ queryKey: key });
  }

  return { pins, pinned, pin, unpin };
}

/**
 * Slim bar under the chat header. Tapping it jumps to the pin shown, then moves
 * on to the next one (newest first), so repeated taps walk through every pin.
 */
export function PinnedBar({
  pins,
  meId,
  partnerName,
  onJump,
  onOpenList,
}: {
  pins: Pin[];
  meId: string;
  partnerName: string;
  onJump: (id: string, at: string) => void;
  onOpenList: () => void;
}) {
  const [index, setIndex] = useState(0);
  if (!pins.length) return null;
  const i = index % pins.length;
  const p = pins[i]!;
  const m = p.message!;
  const who = m.sender_id === meId ? "You" : partnerName;
  return (
    <div
      className="border-line bg-app flex flex-none items-stretch border-b"
      data-testid="pinned-bar"
    >
      <button
        type="button"
        onClick={() => {
          onJump(m.id, m.sent_at);
          setIndex((x) => (x + 1) % pins.length);
        }}
        aria-label={`Pinned message ${i + 1} of ${pins.length}. ${who}: ${previewText(m, m.sender_id === meId)}. Go to message`}
        className="hover:bg-s1 flex min-h-12 min-w-0 flex-1 cursor-pointer items-center gap-3 border-0 bg-transparent py-1.5 pr-2 pl-4 text-left"
      >
        {pins.length > 1 ? (
          <span aria-hidden className="flex h-8 flex-none flex-col gap-0.5">
            {pins.slice(0, 6).map((x, j) => (
              <span
                key={x.message_id}
                className={
                  j === i % 6
                    ? "bg-accent w-0.5 flex-1 rounded-full"
                    : "bg-line w-0.5 flex-1 rounded-full"
                }
              />
            ))}
          </span>
        ) : (
          <span aria-hidden className="bg-accent h-8 w-0.5 flex-none rounded-full" />
        )}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-accent text-xs font-bold">
            {pins.length > 1 ? `Pinned ${i + 1} of ${pins.length}` : "Pinned"}
          </span>
          <span className="text-text truncate text-sm">
            <span className="text-muted">{who}: </span>
            {previewText(m, m.sender_id === meId)}
          </span>
        </span>
        <PushPin size={16} weight="fill" className="text-muted flex-none" aria-hidden />
      </button>
      <button
        type="button"
        onClick={onOpenList}
        aria-label="All pinned messages"
        className="text-muted hover:text-text border-line flex w-12 flex-none cursor-pointer items-center justify-center border-0 border-l bg-transparent"
      >
        <ListBullets size={20} />
      </button>
    </div>
  );
}

/** Every pin, with jump and unpin. */
export function PinsSheet({
  open,
  onOpenChange,
  pins,
  meId,
  partnerName,
  onJump,
  onUnpin,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pins: Pin[];
  meId: string;
  partnerName: string;
  onJump: (id: string, at: string) => void;
  onUnpin: (id: string) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Pinned messages" handle>
      <div className="flex items-baseline justify-between">
        <h2 className="m-0 text-lg font-bold">Pinned messages</h2>
        <span className="mono text-faint text-xs">
          {pins.length} of {MAX_PINS}
        </span>
      </div>
      {pins.length === 0 ? (
        <p className="text-muted m-0 text-sm">
          Nothing pinned. Press and hold a message, then choose Pin.
        </p>
      ) : (
        <ul className="rounded-card border-line bg-s2 divide-line m-0 flex list-none flex-col divide-y overflow-hidden border p-0">
          {pins.map((p) => {
            const m = p.message!;
            const mine = m.sender_id === meId;
            return (
              <li key={p.message_id} className="flex items-stretch">
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    onJump(m.id, m.sent_at);
                  }}
                  className="hover:bg-s3 flex min-h-14 min-w-0 flex-1 cursor-pointer flex-col items-start justify-center gap-0.5 border-0 bg-transparent px-4 py-2 text-left"
                >
                  <span className="text-faint text-xs">
                    {mine ? "You" : partnerName} ·{" "}
                    {new Date(m.sent_at).toLocaleDateString([], {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  <span className="text-text line-clamp-2 text-sm">{previewText(m, mine)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onUnpin(m.id)}
                  aria-label={`Unpin: ${previewText(m, mine)}`}
                  className="text-muted hover:text-text flex w-12 flex-none cursor-pointer items-center justify-center border-0 bg-transparent"
                >
                  <PushPinSlash size={20} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}

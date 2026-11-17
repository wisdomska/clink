"use client";
import { useState } from "react";
import { Microphone, ShieldWarning } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Textarea, Label, FieldError } from "@/components/ui/field";
import { cn } from "@/components/ui/cn";
import { adminFetch } from "./fetch";

interface Msg {
  id: string;
  sender_id: string;
  type: string;
  body: string | null;
  sticker_id: string | null;
  sent_at: string;
  removed_at: string | null;
  media: Array<{ id: string; kind: string; duration: number | null }>;
}
interface Page {
  people: Record<string, string>;
  messages: Msg[];
  more: boolean;
}

/**
 * Read-only chat for an admin, behind a stated reason. Every page loaded is
 * logged with that reason. Private After Dark items never appear.
 */
export function AdminConversation({ userId }: { userId: string }) {
  const [reason, setReason] = useState("");
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [people, setPeople] = useState<Record<string, string>>({});
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (before?: string) => {
    setBusy(true);
    setError(null);
    try {
      const d = await adminFetch<Page>(`/api/admin/users/${userId}/conversation`, {
        body: { reason, before },
      });
      setPeople(d.people);
      setMsgs((cur) => (before && cur ? [...d.messages, ...cur] : d.messages));
      setMore(d.more);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open this conversation. Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!msgs)
    return (
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <p className="text-muted m-0 flex items-start gap-2 text-sm">
          <ShieldWarning size={18} className="text-warning mt-0.5 flex-none" aria-hidden />
          Opening someone&apos;s chat is logged with your reason and your admin email. After Dark
          items are never shown.
        </p>
        <div>
          <Label htmlFor="access-reason">Why do you need to look?</Label>
          <Textarea
            id="access-reason"
            rows={2}
            maxLength={300}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="For example: report #123 mentions harassment, so I'm checking those messages"
          />
        </div>
        <FieldError>{error}</FieldError>
        <Button
          type="submit"
          size="sm"
          loading={busy}
          disabled={reason.trim().length < 5}
          className="self-start"
        >
          Open conversation
        </Button>
      </form>
    );

  return (
    <div className="flex flex-col gap-2">
      {more && (
        <Button
          size="xs"
          variant="ghost"
          loading={busy}
          className="self-center"
          onClick={() => load(msgs[0]?.sent_at)}
        >
          Load older messages
        </Button>
      )}
      <div className="bg-app border-line rounded-input flex max-h-[560px] flex-col gap-1.5 overflow-y-auto border p-3">
        {msgs.length === 0 && (
          <p className="text-muted m-0 text-sm">
            No messages yet. They show here once this couple starts chatting.
          </p>
        )}
        {msgs.map((m) => {
          const subject = m.sender_id === userId;
          return (
            <div
              key={m.id}
              className={cn(
                "flex max-w-[80%] flex-col gap-0.5",
                subject ? "items-end self-end" : "items-start self-start",
              )}
            >
              <span className="text-faint text-[11px]">
                {people[m.sender_id] ?? "Unknown"} ·{" "}
                {new Date(m.sent_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
              </span>
              <div
                className={cn(
                  "rounded-ticket px-3 py-2 text-sm [overflow-wrap:anywhere] whitespace-pre-wrap",
                  subject ? "bg-s3" : "bg-s1 border-line border",
                )}
              >
                {m.removed_at ? (
                  <span className="text-faint italic">Removed by sender</span>
                ) : m.type === "sensitive" ? (
                  <span className="text-faint italic">Private After Dark item (not shown)</span>
                ) : m.type === "sticker" ? (
                  <span className="text-muted">Sticker: {m.sticker_id}</span>
                ) : m.type === "clink" ? (
                  <span className="text-muted">Clink</span>
                ) : m.type === "system" ? (
                  <span className="text-muted">
                    {m.body?.startsWith("call:") ? `Call (${m.body.split(":")[1]})` : m.body}
                  </span>
                ) : (
                  <>
                    {m.media.map((x) =>
                      x.kind === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={x.id}
                          src={`/api/admin/media/${x.id}`}
                          alt="Shared photo"
                          className="rounded-thumb mb-1 max-h-60"
                        />
                      ) : x.kind === "video" ? (
                        <video
                          key={x.id}
                          src={`/api/admin/media/${x.id}`}
                          controls
                          className="rounded-thumb mb-1 max-h-60"
                        />
                      ) : (
                        <span key={x.id} className="mb-1 flex items-center gap-2">
                          <Microphone size={14} aria-hidden />
                          <audio src={`/api/admin/media/${x.id}`} controls className="h-8" />
                        </span>
                      ),
                    )}
                    {m.body}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

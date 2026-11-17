"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, EyeSlash, Moon, PencilSimple, X } from "@phosphor-icons/react";
import { useCouple } from "@/features/couple/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { cn } from "@/components/ui/cn";
import { timeAgo } from "@/lib/time";
import { darkFetch } from "./api";
import { SendSheet } from "./send-sheet";
import { VerifySheet } from "./hub";
import { useDarkState } from "./api";
import { PageBar } from "@/components/clink/page-bar";

type MineStatus = "pending" | "later" | "accepted" | "not_right_now" | "fulfilled" | "cancelled";
interface Mine {
  id: string;
  note: string | null;
  status: MineStatus;
  created_at: string;
}
interface Req {
  rank: number;
  inbox: Array<{ id: string; note: string | null; status: string; created_at: string }>;
  sent: { id: string; status: string; cooldown: boolean } | null;
  cooldownUntil?: string | null;
  maxOpen?: number;
  mine?: Mine[];
}

const KEY = ["requests"];
const DEFAULT_NOTE = "something just for me?";

/**
 * DARK-06 / flow 10.5. Three parts, top to bottom:
 * 1. For you: each of their requests with Accept, Not right now or Later.
 * 2. Ask for something: send one (several can wait at once).
 * 3. You sent: what you asked, where it stands; edit or take back until answered.
 */
export function RequestScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { partner } = useCouple();
  const { data: s } = useDarkState();
  const { data, isLoading } = useQuery({
    queryKey: KEY,
    queryFn: () => darkFetch<Req>("/api/dark/requests"),
  });
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [sendFor, setSendFor] = useState<string | null>(null);
  const [verifyOpen, setVerifyOpen] = useState(false);
  // What you just answered, shown in place of the card until the list refreshes.
  const [answered, setAnswered] = useState<Record<string, "declined" | "later" | "sent">>({});
  const unhinged = (data?.rank ?? 0) >= 4;
  const refresh = () => qc.invalidateQueries({ queryKey: KEY });
  const forYou = (data?.inbox ?? []).filter((r) =>
    ["pending", "later", "accepted"].includes(r.status),
  );
  const mine = data?.mine ?? [];
  const open = mine.filter((m) => m.status === "pending" || m.status === "later");
  const maxOpen = data?.maxOpen ?? 5;
  const coolingDown = Boolean(data?.cooldownUntil ?? data?.sent?.cooldown);

  function patchMine(fn: (m: Mine[]) => Mine[]) {
    qc.setQueryData<Req>(KEY, (d) => (d ? { ...d, mine: fn(d.mine ?? []) } : d));
  }

  async function sendRequest() {
    if (sending) return;
    setSending(true);
    const text = note.trim();
    try {
      const r = await darkFetch<{ id: string }>("/api/dark/requests", {
        note: text || undefined,
      });
      // On the list straight away; the server copy follows.
      patchMine((m) => [
        { id: r.id, note: text || null, status: "pending", created_at: new Date().toISOString() },
        ...m,
      ]);
      setNote("");
      toast.ok(`Sent. ${partner.name} can say yes, not right now, or later.`);
    } catch (e) {
      toast.err(e instanceof Error ? e.message : "Couldn't send. Try again.");
    } finally {
      setSending(false);
      void refresh();
    }
  }

  async function respond(id: string, response: "accept" | "decline" | "later") {
    // Optimistic: show the outcome now, undo it if the server refuses.
    if (response === "accept") setSendFor(id);
    else setAnswered((a) => ({ ...a, [id]: response === "decline" ? "declined" : "later" }));
    try {
      await darkFetch(`/api/dark/requests/${id}`, { response });
    } catch (e) {
      setSendFor(null);
      setAnswered((a) => {
        const next = { ...a };
        delete next[id];
        return next;
      });
      toast.err(e instanceof Error ? e.message : "Couldn't send that. Try again.");
    }
    void refresh();
  }

  return (
    <main className="an-screen mx-auto flex min-h-dvh w-full max-w-[560px] flex-col gap-6 px-4 pt-[var(--screen-pt)] pb-10 [--screen-pt:calc(env(safe-area-inset-top)+8px)] md:[--screen-pt:2.0rem] lg:max-w-[1040px]">
      <PageBar title="Requests" back="/dark/home" />

      {isLoading ? (
        <div className="flex flex-col gap-3" aria-busy>
          <div className="an-skel rounded-card bg-s2 h-28" />
          <div className="an-skel rounded-card bg-s2 h-20" />
        </div>
      ) : !unhinged ? (
        <section className="flex max-w-[560px] flex-col gap-4">
          <h2 className="display m-0 text-[28px] leading-[1.1]">Ask for something</h2>
          <p className="text-muted m-0 text-base leading-normal">
            Requests open with Unhinged, once you&apos;ve both opted in and both verified
            you&apos;re 18+.
          </p>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => (s?.me.verified ? router.push("/dark/consent") : setVerifyOpen(true))}
          >
            {s?.me.verified ? "Check your tiers" : "Verify I'm 18+"}
          </Button>
        </section>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-10">
          <div className="flex min-w-0 flex-col gap-6">
            {forYou.length > 0 && (
              <section className="flex flex-col gap-3" aria-labelledby="for-you">
                <h2 id="for-you" className="m-0 text-lg font-bold">
                  From {partner.name}
                </h2>
                {forYou.map((r) => (
                  <IncomingCard
                    key={r.id}
                    note={r.note}
                    status={r.status}
                    at={r.created_at}
                    answered={answered[r.id]}
                    partner={partner.name}
                    onRespond={(resp) => respond(r.id, resp)}
                    onSend={() => setSendFor(r.id)}
                  />
                ))}
              </section>
            )}

            <section className="flex flex-col gap-3" aria-labelledby="ask">
              <h2 id="ask" className="display m-0 text-[28px] leading-[1.1]">
                Ask for something
              </h2>
              {coolingDown ? (
                <p className="rounded-input bg-s2 text-muted m-0 p-3.5 text-sm leading-normal">
                  {partner.name} said not right now, so new requests pause for a little while. No
                  pressure either way.
                </p>
              ) : open.length >= maxOpen ? (
                <p className="rounded-input bg-s2 text-muted m-0 p-3.5 text-sm leading-normal">
                  {maxOpen} are waiting with {partner.name}. Give them a moment, or take one back.
                </p>
              ) : (
                <form
                  className="flex flex-col gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void sendRequest();
                  }}
                >
                  <Input
                    aria-label="A short note (optional)"
                    placeholder={DEFAULT_NOTE}
                    value={note}
                    maxLength={120}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <Button type="submit" loading={sending}>
                    Send request
                  </Button>
                  <p className="text-faint m-0 text-xs">
                    {partner.name} sees your note blurred until they open it. No reminders, ever.
                  </p>
                </form>
              )}
            </section>
          </div>

          {mine.length > 0 && (
            <section className="flex flex-col gap-2" aria-labelledby="you-sent">
              <h2 id="you-sent" className="m-0 text-lg font-bold">
                You sent
              </h2>
              <ul className="rounded-card border-line bg-s1 divide-line m-0 flex list-none flex-col divide-y overflow-hidden border p-0">
                {mine.map((m) => (
                  <SentRow key={m.id} req={m} partner={partner.name} onChange={patchMine} />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <SendSheet
        open={Boolean(sendFor)}
        requestId={sendFor ?? undefined}
        onClose={() => setSendFor(null)}
        onSent={() => {
          if (sendFor) setAnswered((a) => ({ ...a, [sendFor]: "sent" }));
          void refresh();
        }}
      />
      <VerifySheet
        open={verifyOpen}
        onOpenChange={setVerifyOpen}
        meVerified={Boolean(s?.me.verified)}
        partnerVerified={Boolean(s?.partner.verified)}
      />
    </main>
  );
}

/** One of their requests, with your three answers. */
function IncomingCard({
  note,
  status,
  at,
  answered,
  partner,
  onRespond,
  onSend,
}: {
  note: string | null;
  status: string;
  at: string;
  answered?: "declined" | "later" | "sent";
  partner: string;
  onRespond: (r: "accept" | "decline" | "later") => void;
  onSend: () => void;
}) {
  if (answered)
    return (
      <div className="an-reveal rounded-card border-line bg-s1 flex items-start gap-3 border p-4">
        <Moon size={22} className="text-ember mt-0.5 flex-none" aria-hidden />
        <div className="flex flex-col gap-1">
          <span className="text-base font-bold">
            {answered === "declined"
              ? "Sent: Not right now."
              : answered === "later"
                ? "Saved for later."
                : "Sent. View once."}
          </span>
          <span className="text-muted text-sm leading-normal">
            {answered === "declined"
              ? `That's all ${partner} sees. New requests pause for 12 h.`
              : answered === "later"
                ? "It stays here. No reminders, ever."
                : "You can unsend it any time. They see a blurred card until they tap."}
          </span>
        </div>
      </div>
    );
  return (
    <div className="rounded-card border-line bg-s1 flex flex-col gap-3 border p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted flex items-center gap-1.5 text-xs font-medium">
          <EyeSlash size={14} className="text-ember" aria-hidden />
          {status === "later" ? "Saved for later" : status === "accepted" ? "You said yes" : "New"}
        </span>
        <span className="text-faint text-xs">{timeAgo(at)}</span>
      </div>
      <p className="display m-0 text-[22px] leading-[1.15]">&quot;{note || DEFAULT_NOTE}&quot;</p>
      {status === "accepted" ? (
        <Button onClick={onSend}>Send something</Button>
      ) : (
        <>
          <Button onClick={() => onRespond("accept")}>Accept</Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" size="lg" onClick={() => onRespond("decline")}>
              Not right now
            </Button>
            {status !== "later" && (
              <Button variant="ghost" size="lg" onClick={() => onRespond("later")}>
                Later
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const STATUS: Record<MineStatus, { label: string; cls: string }> = {
  pending: { label: "Waiting", cls: "border-ember text-text" },
  later: { label: "Saved for later", cls: "border-line text-muted" },
  accepted: { label: "They said yes", cls: "bg-ember text-on-accent border-transparent" },
  fulfilled: { label: "They sent something", cls: "bg-ember text-on-accent border-transparent" },
  not_right_now: { label: "Not right now", cls: "border-line text-faint" },
  cancelled: { label: "Taken back", cls: "border-line text-faint" },
};

/** One of your requests: what you asked, where it is, and (until answered) edit or take back. */
function SentRow({
  req,
  partner,
  onChange,
}: {
  req: Mine;
  partner: string;
  onChange: (fn: (m: Mine[]) => Mine[]) => void;
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(req.note ?? "");
  const [busy, setBusy] = useState<null | "save" | "cancel">(null);
  const open = req.status === "pending" || req.status === "later";
  const st = STATUS[req.status] ?? STATUS.pending;

  async function save() {
    if (busy) return;
    setBusy("save");
    const before = req.note;
    const next = draft.trim() || null;
    onChange((m) => m.map((x) => (x.id === req.id ? { ...x, note: next } : x)));
    setEditing(false);
    try {
      await darkFetch(`/api/dark/requests/${req.id}`, { response: "edit", note: next ?? "" });
      toast.ok("Updated.");
    } catch (e) {
      onChange((m) => m.map((x) => (x.id === req.id ? { ...x, note: before } : x)));
      toast.err(e instanceof Error ? e.message : "Couldn't save that. Try again.");
    } finally {
      setBusy(null);
      void qc.invalidateQueries({ queryKey: KEY });
    }
  }

  async function takeBack() {
    if (busy) return;
    setBusy("cancel");
    onChange((m) => m.map((x) => (x.id === req.id ? { ...x, status: "cancelled" } : x)));
    try {
      await darkFetch(`/api/dark/requests/${req.id}`, { response: "cancel" });
      toast("Taken back. Nothing was sent.");
    } catch (e) {
      onChange((m) => m.map((x) => (x.id === req.id ? { ...x, status: req.status } : x)));
      toast.err(e instanceof Error ? e.message : "Couldn't take it back. Try again.");
    } finally {
      setBusy(null);
      void qc.invalidateQueries({ queryKey: KEY });
    }
  }

  return (
    <li className="flex flex-col gap-2.5 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-semibold", st.cls)}>
          {st.label}
        </span>
        <span className="text-faint text-xs">{timeAgo(req.created_at)}</span>
      </div>
      {editing ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <Input
            aria-label="Edit your note"
            value={draft}
            maxLength={120}
            placeholder={DEFAULT_NOTE}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
          />
          <div className="flex gap-2">
            <Button size="sm" type="submit" loading={busy === "save"}>
              <Check size={16} weight="bold" aria-hidden /> Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <p
          className={cn(
            "m-0 text-base leading-snug break-words",
            req.status === "cancelled" && "text-faint line-through",
          )}
        >
          &quot;{req.note || DEFAULT_NOTE}&quot;
        </p>
      )}
      {open && !editing && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setDraft(req.note ?? "");
              setEditing(true);
            }}
            aria-label={`Edit request: ${req.note || DEFAULT_NOTE}`}
          >
            <PencilSimple size={16} aria-hidden /> Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            loading={busy === "cancel"}
            onClick={takeBack}
            aria-label={`Take back request: ${req.note || DEFAULT_NOTE}`}
          >
            <X size={16} aria-hidden /> Take it back
          </Button>
        </div>
      )}
      {req.status === "pending" && !editing && (
        <span className="text-faint text-xs">With {partner}. No rush, and no reminders.</span>
      )}
    </li>
  );
}

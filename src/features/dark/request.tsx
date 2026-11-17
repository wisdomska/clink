"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { EyeSlash, Moon } from "@phosphor-icons/react";
import { useCouple } from "@/features/couple/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { darkFetch } from "./api";
import { SendSheet } from "./send-sheet";
import { VerifySheet } from "./hub";
import { useDarkState } from "./api";
import { PageBar } from "@/components/clink/page-bar";

interface Req {
  rank: number;
  inbox: Array<{ id: string; note: string | null; status: string; created_at: string }>;
  sent: { id: string; status: string; cooldown: boolean } | null;
}

/** DARK-06 / flow 10.5: sent, received (Accept / Not right now / Later), accepted, declined, later. */
export function RequestScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { partner } = useCouple();
  const { data: s } = useDarkState();
  const { data } = useQuery({
    queryKey: ["requests"],
    queryFn: () => darkFetch<Req>("/api/dark/requests"),
  });
  const [note, setNote] = useState("");
  const [result, setResult] = useState<null | "sent" | "declined" | "later">(null);
  const [sendFor, setSendFor] = useState<string | null>(null);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const received = data?.inbox.find((r) => r.status === "pending" || r.status === "later");
  const accepted = data?.inbox.find((r) => r.status === "accepted");
  const unhinged = (data?.rank ?? 0) >= 4;
  const refresh = () => qc.invalidateQueries({ queryKey: ["requests"] });

  async function sendRequest() {
    if (sending) return;
    setSending(true);
    try {
      const r = await darkFetch<{ id: string }>("/api/dark/requests", { note: note || undefined });
      // Show it as sent straight away; the server copy follows.
      qc.setQueryData<Req>(["requests"], (d) =>
        d ? { ...d, sent: { id: r.id, status: "pending", cooldown: false } } : d,
      );
      setNote("");
      toast.ok(`Sent. ${partner.name} can say yes, not right now, or later.`);
      void refresh();
    } catch (e) {
      toast.err(e instanceof Error ? e.message : "Couldn't send. Try again.");
      void refresh();
    } finally {
      setSending(false);
    }
  }

  async function takeBack(id: string) {
    if (cancelling) return;
    setCancelling(true);
    try {
      await darkFetch(`/api/dark/requests/${id}`, { response: "cancel" });
      qc.setQueryData<Req>(["requests"], (d) => (d ? { ...d, sent: null } : d));
      toast("Taken back. Nothing was sent.");
      void refresh();
    } catch (e) {
      toast.err(e instanceof Error ? e.message : "Couldn't take it back. Try again.");
    } finally {
      setCancelling(false);
    }
  }

  async function respond(id: string, response: "accept" | "decline" | "later") {
    // Optimistic: show the outcome now, undo it if the server refuses.
    if (response === "accept") setSendFor(id);
    else setResult(response === "decline" ? "declined" : "later");
    try {
      await darkFetch(`/api/dark/requests/${id}`, { response });
    } catch (e) {
      setSendFor(null);
      setResult(null);
      toast.err(e instanceof Error ? e.message : "Couldn't send that. Try again.");
    }
    void refresh();
  }

  const titles = {
    sent: "Sent. View once.",
    declined: "Sent: Not right now.",
    later: "Saved for later.",
  };
  const bodies = {
    sent: "You can unsend it any time. They see a blurred card until they tap.",
    declined: `That's all ${partner.name} sees. New requests pause for 12 h.`,
    later: "Moved to your After Dark inbox. No reminders, ever.",
  };

  return (
    <main className="an-screen mx-auto flex min-h-dvh max-w-[560px] flex-col gap-4 px-4 pt-[var(--screen-pt)] pb-8 [--screen-pt:calc(env(safe-area-inset-top)+8px)] md:[--screen-pt:2.0rem]">
      <PageBar title="Request" back="/dark/home" />
      {result ? (
        <>
          <div className="an-reveal flex flex-1 flex-col justify-center gap-3">
            <Moon size={40} className="text-ember" aria-hidden />
            <div className="display text-[36px] leading-[1.05]">{titles[result]}</div>
            <p className="text-muted m-0 text-base leading-normal">{bodies[result]}</p>
          </div>
          <Button variant="secondary" size="lg" onClick={() => router.push("/dark/home")}>
            Back to After Dark
          </Button>
        </>
      ) : received ? (
        <>
          <h2 className="display m-0 text-[28px] leading-[1.1]">
            {partner.name} sent you a request
          </h2>
          <div className="rounded-card border-line bg-s2 flex aspect-[4/3] flex-none flex-col items-center justify-center gap-2 border">
            <EyeSlash size={28} className="text-ember" aria-hidden />
            <span className="px-6 text-center text-base font-medium">
              &quot;{received.note || "something just for me?"}&quot;
            </span>
          </div>
          <p className="text-muted m-0 text-base leading-normal">
            No pressure, ever. Not right now is always a fine answer.
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={() => respond(received.id, "accept")}>Accept</Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" size="lg" onClick={() => respond(received.id, "decline")}>
                Not right now
              </Button>
              <Button variant="ghost" size="lg" onClick={() => respond(received.id, "later")}>
                Later
              </Button>
            </div>
          </div>
        </>
      ) : accepted ? (
        <div className="flex flex-col gap-3">
          <div className="display text-[28px] leading-[1.05]">
            You said yes to {partner.name}&apos;s request.
          </div>
          <Button onClick={() => setSendFor(accepted.id)}>Send something</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <h2 className="display m-0 text-[28px] leading-[1.1]">Ask for something</h2>
          {!unhinged ? (
            <>
              <p className="text-muted m-0 text-base leading-normal">
                Requests open with Unhinged, once you&apos;ve both opted in and both verified
                you&apos;re 18+.
              </p>
              <Button
                variant="secondary"
                size="lg"
                onClick={() =>
                  s?.me.verified ? router.push("/dark/consent") : setVerifyOpen(true)
                }
              >
                {s?.me.verified ? "Check your tiers" : "Verify I'm 18+"}
              </Button>
            </>
          ) : data?.sent && (data.sent.status === "pending" || data.sent.status === "later") ? (
            <div className="an-reveal rounded-card border-line bg-s1 flex flex-col gap-3 border p-4">
              <span className="flex items-center gap-2 text-base font-bold">
                <Moon size={20} className="text-ember" aria-hidden /> Request sent
              </span>
              <p className="text-muted m-0 text-sm leading-normal">
                It&apos;s with {partner.name}. They can say yes, not right now, or later. No rush,
                and no reminders.
              </p>
              <Button
                variant="ghost"
                size="sm"
                loading={cancelling}
                onClick={() => takeBack(data.sent!.id)}
                className="self-start"
              >
                Take it back
              </Button>
            </div>
          ) : data?.sent?.cooldown ? (
            <p className="text-muted m-0 text-base">
              Not right now. Requests pause for a little while.
            </p>
          ) : (
            <>
              <Input
                aria-label="A short note (optional)"
                onKeyDown={(e) => e.key === "Enter" && void sendRequest()}
                placeholder="something just for me?"
                value={note}
                maxLength={120}
                onChange={(e) => setNote(e.target.value)}
              />
              <Button loading={sending} onClick={sendRequest}>
                Send request
              </Button>
            </>
          )}
          {data?.sent?.status === "not_right_now" && (
            <p className="text-faint m-0 text-sm">Your last request: Not right now.</p>
          )}
        </div>
      )}
      <SendSheet
        open={Boolean(sendFor)}
        requestId={sendFor ?? undefined}
        onClose={() => setSendFor(null)}
        onSent={() => setResult("sent")}
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

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, EyeSlash, Moon } from "@phosphor-icons/react";
import { useCouple } from "@/features/couple/context";
import { Button, IconButton } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { darkFetch } from "./api";
import { SendSheet } from "./send-sheet";
import { VerifySheet } from "./hub";
import { useDarkState } from "./api";

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
  const received = data?.inbox.find((r) => r.status === "pending" || r.status === "later");
  const accepted = data?.inbox.find((r) => r.status === "accepted");
  const unhinged = (data?.rank ?? 0) >= 4;
  const refresh = () => qc.invalidateQueries({ queryKey: ["requests"] });

  async function respond(id: string, response: "accept" | "decline" | "later") {
    await darkFetch(`/api/dark/requests/${id}`, { response });
    if (response === "accept") setSendFor(id);
    else setResult(response === "decline" ? "declined" : "later");
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
    <main className="an-screen mx-auto flex min-h-dvh max-w-[560px] flex-col gap-4 px-4 pt-[calc(env(safe-area-inset-top)+8px)] pb-8 md:pt-8">
      <div className="flex items-center gap-3">
        <IconButton label="Back" onClick={() => router.push("/dark/home")}>
          <ArrowLeft size={20} />
        </IconButton>
        <div className="text-muted text-sm font-medium">Request</div>
      </div>
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
          <h1 className="display mt-2 mb-0 text-[36px] leading-[1.05]">
            {partner.name} sent you a request
          </h1>
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
          <h1 className="display mt-2 mb-0 text-[36px] leading-[1.05]">Ask for something</h1>
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
            <p className="text-muted m-0 text-base">
              Your request is with {partner.name}. No rush, and no reminders.
            </p>
          ) : data?.sent?.cooldown ? (
            <p className="text-muted m-0 text-base">
              Not right now. Requests pause for a little while.
            </p>
          ) : (
            <>
              <Input
                aria-label="A short note (optional)"
                placeholder="something just for me?"
                value={note}
                maxLength={120}
                onChange={(e) => setNote(e.target.value)}
              />
              <Button
                onClick={async () => {
                  try {
                    await darkFetch("/api/dark/requests", { note: note || undefined });
                    toast.err(`Sent. ${partner.name} can say yes, not right now, or later.`);
                    setNote("");
                    void refresh();
                  } catch (e) {
                    toast.err(e instanceof Error ? e.message : "Couldn't send.");
                  }
                }}
              >
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

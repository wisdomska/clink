"use client";
import { feedback } from "@/lib/feedback";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Copy,
  Check,
  HourglassSimpleLow,
  ShareNetwork,
  Wine,
} from "@phosphor-icons/react";
import { Button, IconButton } from "@/components/ui/button";
import { ShareSheet } from "@/components/clink/share-sheet";
import { Display, Lead } from "@/components/ui/heading";
import { FieldError } from "@/components/ui/field";
import { Sparks } from "@/components/clink/sparks";
import { toast } from "@/components/ui/toast";
import { supabaseBrowser } from "@/lib/supabase/client";
import { subscribeAuthed } from "@/lib/realtime";
import { MemojiArt } from "@/components/clink/memoji-art";
import { parseMemoji } from "@/lib/avatars";

type Invite = { code: string; expires_at: string };

export function LinkScreen({
  me,
  userId,
  prefillCode = null,
  focusEnter = false,
  startLinked = false,
  initialPartner = "",
  verified = true,
  archive = null,
}: {
  me: string;
  userId?: string;
  prefillCode?: string | null;
  focusEnter?: boolean;
  startLinked?: boolean;
  initialPartner?: string;
  verified?: boolean;
  archive?: { partner: string; until: string } | null;
}) {
  const router = useRouter();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [copied, setCopied] = useState(false);
  const [entry, setEntry] = useState(prefillCode?.toUpperCase().slice(0, 6) ?? "");
  const [confirmName, setConfirmName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [partner, setPartner] = useState(initialPartner);
  const [linked, setLinked] = useState(startLinked);
  const [busy, setBusy] = useState(false);
  const [, tick] = useState(0);

  const expired = invite ? new Date(invite.expires_at).getTime() <= Date.now() : false;

  const applyInvite = useCallback(async (res: Response) => {
    const data = await res.json();
    if (res.status === 409 && data.error === "already_linked") {
      const st = await (await fetch("/api/me/state")).json();
      if (st.linked) {
        setPartner(st.partner);
        setLinked(true);
        return;
      }
    }
    if (!res.ok) {
      setInviteError(data.message);
      return;
    }
    setInviteError(null);
    setInvite(data);
    setCopied(false);
  }, []);

  const loadInvite = useCallback(
    async (fresh = false) =>
      applyInvite(await fetch(`/api/invites${fresh ? "?fresh=1" : ""}`, { method: "POST" })),
    [applyInvite],
  );

  useEffect(() => {
    if (linked || !verified) return;
    let cancelled = false;
    void fetch("/api/invites", { method: "POST" }).then((res) =>
      cancelled ? undefined : applyInvite(res),
    );
    return () => {
      cancelled = true;
    };
  }, [linked, verified, applyInvite]);

  // The inviter learns they are linked from a realtime insert on their own
  // membership row, with polling (and a check on focus) as the fallback.
  useEffect(() => {
    if (linked) return;
    let done = false;
    const check = async () => {
      if (done) return;
      tick((n) => n + 1);
      const res = await fetch("/api/me/state");
      if (!res.ok) return;
      const s = await res.json();
      if (s.linked && !done) {
        done = true;
        setPartner(s.partner);
        setLinked(true);
      }
    };
    const sb = supabaseBrowser();
    const unsub = userId
      ? subscribeAuthed(
          sb.channel(`linking:${userId}`).on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "couple_members",
              filter: `user_id=eq.${userId}`,
            },
            () => void check(),
          ),
        )
      : null;
    const t = setInterval(check, 4000);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      done = true;
      clearInterval(t);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
      unsub?.();
    };
  }, [linked, router, userId]);

  // Arriving from a shared link: look up the inviter to ask "Link with [name]?"
  useEffect(() => {
    if (!prefillCode || linked) return;
    void preview(prefillCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function preview(code: string) {
    setError(null);
    const res = await fetch(`/api/invites/preview?code=${encodeURIComponent(code)}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.message);
      return;
    }
    setConfirmName(data.name);
  }

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: entry }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message);
        setConfirmName(null);
        return;
      }
      setPartner(data.partner);
      setLinked(true);
      feedback("success", "clink");
    } finally {
      setBusy(false);
    }
  }

  const shareUrl = invite ? `${window.location.origin}/j/${invite.code}` : "";
  const [shareOpen, setShareOpen] = useState(false);
  const shareText = invite ? `Link with me on Clink. Code ${invite.code}, or tap: ${shareUrl}` : "";
  const hoursLeft = invite
    ? Math.max(0, Math.ceil((new Date(invite.expires_at).getTime() - Date.now()) / 3600000))
    : 0;

  if (linked) {
    return (
      <div className="an-screen flex flex-1 flex-col">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <LinkedPair />
          <Display size={48} className="mt-7">
            You&apos;re linked.
          </Display>
          <Lead className="mt-3">
            {me} and {partner}. Two people, one Clink.
          </Lead>
        </div>
        <div className="flex flex-col gap-2">
          <Button onClick={() => router.push("/us?first=1")}>
            <Wine size={22} aria-hidden />
            Send your first Clink
          </Button>
          <Button variant="text" size="lg" onClick={() => router.push("/install")}>
            Add Clink to your home screen
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="an-screen flex flex-1 flex-col">
      <IconButton label="Back" onClick={() => router.push("/onboarding")}>
        <ArrowLeft size={20} />
      </IconButton>
      <Display size={36} className="mt-6">
        Link your partner
      </Display>
      <Lead className="mt-2">One account, one person. Send them this code, or enter theirs.</Lead>
      {archive && (
        <a
          href="/archive"
          className="rounded-card border-line bg-s1 text-text hover:text-text mt-5 block border p-4 text-base"
        >
          Your old chat with {archive.partner} is readable until{" "}
          {new Date(archive.until).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}.
          <span className="text-accent mt-1 block font-medium">Open it</span>
        </a>
      )}

      {!verified ? (
        <div className="rounded-card border-line bg-s1 text-muted mt-7 border p-4 text-base leading-normal">
          Confirm your email first. Tap the link we sent you, then come back here.
        </div>
      ) : (
        <>
          <div
            role="group"
            className="relative mt-7 mb-2.5 flex gap-1.5"
            aria-label={
              invite ? `Your code ${invite.code.split("").join(" ")}` : "Making your code"
            }
          >
            {(invite?.code ?? "      ").split("").map((ch, i) => (
              <div
                key={i}
                aria-hidden
                className="mono rounded-thumb border-line bg-s1 flex h-16 flex-1 items-center justify-center border text-[30px]"
                style={{ opacity: expired ? 0.35 : 1, marginRight: i === 2 ? 8 : 0 }}
              >
                {ch.trim() ? ch : <span className="an-skel bg-s2 block h-7 w-4 rounded" />}
              </div>
            ))}
            {expired && (
              <div
                aria-hidden
                className="bg-danger absolute -inset-x-1 top-1/2 h-0.5"
                style={{ transform: "rotate(-4deg)" }}
              />
            )}
          </div>
          {invite && !expired && (
            <div className="mono text-muted text-sm">Expires in {hoursLeft} h. Single use.</div>
          )}
          {expired && (
            <div className="text-danger flex items-center gap-1.5 text-sm font-medium">
              <HourglassSimpleLow size={18} aria-hidden />
              That code expired. Codes last 48 h.
            </div>
          )}
          <FieldError>{inviteError}</FieldError>
          <div className="mt-6 flex flex-col gap-2">
            {!expired ? (
              <>
                <Button disabled={!invite} onClick={() => setShareOpen(true)}>
                  <ShareNetwork size={22} weight="bold" aria-hidden />
                  Share link
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  disabled={!invite}
                  onClick={async () => {
                    if (!invite) return;
                    await navigator.clipboard.writeText(invite.code).catch(() => undefined);
                    setCopied(true);
                    toast("Copied. Send it to your partner.");
                  }}
                >
                  {copied ? <Check size={20} aria-hidden /> : <Copy size={20} aria-hidden />}
                  {copied ? "Copied" : "Copy code"}
                </Button>
              </>
            ) : (
              <Button onClick={() => loadInvite(true)}>Make a new code</Button>
            )}
          </div>
        </>
      )}

      <ShareSheet
        open={shareOpen}
        onOpenChange={setShareOpen}
        title="Share your link"
        text={shareText}
        url={shareUrl}
      />

      <div className="text-faint mt-8 mb-3 flex items-center gap-3 text-sm font-medium">
        <span className="bg-line h-px flex-1" />
        Got their code?
        <span className="bg-line h-px flex-1" />
      </div>
      {confirmName ? (
        <div className="an-reveal rounded-card bg-s2 flex flex-col gap-3 p-4">
          <div className="display text-[22px]">Link with {confirmName}?</div>
          <p className="text-muted m-0 text-sm">
            You can only link with one person. You can unlink later in Settings.
          </p>
          <div className="flex gap-2">
            <Button size="md" onClick={accept} loading={busy}>
              Link us
            </Button>
            <Button size="md" variant="ghost" onClick={() => setConfirmName(null)}>
              Not them
            </Button>
          </div>
        </div>
      ) : (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (entry.length === 6) void preview(entry);
            else setError("Codes are 6 letters and numbers.");
          }}
        >
          <input
            aria-label="Partner code"
            placeholder="6 characters"
            autoFocus={focusEnter}
            autoCapitalize="characters"
            autoComplete="one-time-code"
            value={entry}
            onChange={(e) =>
              setEntry(
                e.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, "")
                  .slice(0, 6),
              )
            }
            className="mono rounded-input border-line bg-s2 text-text focus:border-accent h-[52px] min-w-0 flex-1 border px-4 text-lg uppercase outline-none"
          />
          <Button type="submit" variant="secondary" size="lg" className="font-bold">
            Link
          </Button>
        </form>
      )}
      <FieldError>{error}</FieldError>
    </div>
  );
}

/** The two of you as memoji: you blowing a kiss, them with heart hands. */
function LinkedPair() {
  const [pair, setPair] = useState<{ mine: string; theirs: string } | null>(null);
  useEffect(() => {
    let live = true;
    void fetch("/api/me/state")
      .then((r) => r.json())
      .then((s: { myAvatar?: string | null; partnerAvatar?: string | null }) => {
        const person = (k?: string | null, fallback = "p15") =>
          parseMemoji(k ?? "")?.person ?? fallback;
        if (live) setPair({ mine: person(s.myAvatar), theirs: person(s.partnerAvatar, "p12") });
      })
      .catch(() => live && setPair({ mine: "p15", theirs: "p12" }));
    return () => {
      live = false;
    };
  }, []);
  return (
    <div className="relative flex h-[150px] items-end justify-center" aria-hidden>
      {pair && (
        <>
          <MemojiArt person={pair.mine} pose="kiss" size={132} tilt={-4} />
          <MemojiArt
            person={pair.theirs}
            pose="heart"
            size={132}
            tilt={4}
            delay={0.12}
            className="-ml-4"
          />
        </>
      )}
      <Sparks variant="spark-late" className="top-0 left-1/2 z-[2]" />
    </div>
  );
}

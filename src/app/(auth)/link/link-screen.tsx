"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, WhatsappLogo, Copy, Check, HourglassSimpleLow, Wine } from "@phosphor-icons/react";
import { Button, IconButton } from "@/components/ui/button";
import { Display, Lead } from "@/components/ui/heading";
import { FieldError } from "@/components/ui/field";
import { Sparks } from "@/components/clink/sparks";
import { toast } from "@/components/ui/toast";
import { supabaseBrowser } from "@/lib/supabase/client";

type Invite = { code: string; expires_at: string };

export function LinkScreen({
  me,
  userId,
  prefillCode = null,
  focusEnter = false,
  startLinked = false,
  initialPartner = "",
  verified = true,
}: {
  me: string;
  userId?: string;
  prefillCode?: string | null;
  focusEnter?: boolean;
  startLinked?: boolean;
  initialPartner?: string;
  verified?: boolean;
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

  const loadInvite = useCallback(async (fresh = false) => {
    setInviteError(null);
    const res = await fetch(`/api/invites${fresh ? "?fresh=1" : ""}`, { method: "POST" });
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
    setInvite(data);
    setCopied(false);
  }, []);

  useEffect(() => {
    if (!linked && verified) void loadInvite();
  }, [linked, verified, loadInvite]);

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
    const ch = userId
      ? sb
          .channel(`linking:${userId}`)
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "couple_members", filter: `user_id=eq.${userId}` }, () => void check())
          .subscribe()
      : null;
    const t = setInterval(check, 4000);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      done = true;
      clearInterval(t);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
      if (ch) void sb.removeChannel(ch);
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
      navigator.vibrate?.([30, 60, 30]);
    } finally {
      setBusy(false);
    }
  }

  const shareUrl = invite ? `${window.location.origin}/j/${invite.code}` : "";
  const shareText = invite ? `Link with me on Clink. Code ${invite.code}, or tap: ${shareUrl}` : "";
  const hoursLeft = invite ? Math.max(0, Math.ceil((new Date(invite.expires_at).getTime() - Date.now()) / 3600000)) : 0;

  if (linked) {
    const a = (me.trim()[0] ?? "Y").toUpperCase();
    const b = (partner.trim()[0] ?? "?").toUpperCase();
    return (
      <div className="an-screen flex flex-1 flex-col">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="relative flex h-[150px] items-center justify-center" aria-hidden>
            <div className="an-linkL display relative z-[1] -mr-3.5 flex h-28 w-28 items-center justify-center rounded-full border-[3px] border-pa bg-s2 text-[44px]">
              {a}
            </div>
            <div className="an-linkR display -ml-3.5 flex h-28 w-28 items-center justify-center rounded-full border-[3px] border-pb bg-s3 text-[44px]">
              {b}
            </div>
            <Sparks variant="spark-late" className="top-3.5 left-1/2 z-[2]" />
          </div>
          <Display size={48} className="mt-7">
            You&apos;re <em>linked</em>.
          </Display>
          <Lead className="mt-3">
            {me} and {partner}. Two cities, one Clink.
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
        Link your <em>person</em>
      </Display>
      <Lead className="mt-2">One account, one person. Send them this code, or enter theirs.</Lead>

      {!verified ? (
        <div className="mt-7 rounded-card border border-line bg-s1 p-4 text-base leading-normal text-muted">
          Confirm your email first. Tap the link we sent you, then come back here.
        </div>
      ) : (
        <>
          <div className="relative mt-7 mb-2.5 flex gap-1.5" aria-label={invite ? `Your code ${invite.code.split("").join(" ")}` : "Making your code"}>
            {(invite?.code ?? "      ").split("").map((ch, i) => (
              <div
                key={i}
                aria-hidden
                className="mono flex h-16 flex-1 items-center justify-center rounded-thumb border border-line bg-s1 text-[30px]"
                style={{ opacity: expired ? 0.35 : 1, marginRight: i === 2 ? 8 : 0 }}
              >
                {ch.trim() ? ch : <span className="an-skel block h-7 w-4 rounded bg-s2" />}
              </div>
            ))}
            {expired && <div aria-hidden className="absolute -inset-x-1 top-1/2 h-0.5 bg-danger" style={{ transform: "rotate(-4deg)" }} />}
          </div>
          {invite && !expired && <div className="mono text-sm text-muted">Expires in {hoursLeft} h. Single use.</div>}
          {expired && (
            <div className="flex items-center gap-1.5 text-sm font-medium text-danger">
              <HourglassSimpleLow size={18} aria-hidden />
              That code expired. Codes last 48 h.
            </div>
          )}
          <FieldError>{inviteError}</FieldError>
          <div className="mt-6 flex flex-col gap-2">
            {!expired ? (
              <>
                <a
                  href={invite ? `https://wa.me/?text=${encodeURIComponent(shareText)}` : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-disabled={!invite}
                  className="press flex h-14 items-center justify-center gap-2 rounded-full bg-accent text-base font-bold text-on-accent hover:text-on-accent"
                  onClick={async (e) => {
                    if (!invite) return e.preventDefault();
                    if (navigator.share) {
                      e.preventDefault();
                      await navigator.share({ text: shareText }).catch(() => undefined);
                    }
                  }}
                >
                  <WhatsappLogo size={22} aria-hidden />
                  Share to WhatsApp
                </a>
                <Button
                  variant="secondary"
                  size="lg"
                  disabled={!invite}
                  onClick={async () => {
                    if (!invite) return;
                    await navigator.clipboard.writeText(invite.code).catch(() => undefined);
                    setCopied(true);
                    toast("Copied. Send it to your person.");
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

      <div className="mt-8 mb-3 flex items-center gap-3 text-sm font-medium text-faint">
        <span className="h-px flex-1 bg-line" />
        Got their code?
        <span className="h-px flex-1 bg-line" />
      </div>
      {confirmName ? (
        <div className="an-reveal flex flex-col gap-3 rounded-card bg-s2 p-4">
          <div className="display text-[22px]">Link with {confirmName}?</div>
          <p className="m-0 text-sm text-muted">You can only link with one person. You can unlink later in Settings.</p>
          <div className="flex gap-2">
            <Button size="md" onClick={accept} disabled={busy}>
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
            onChange={(e) => setEntry(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
            className="mono h-[52px] min-w-0 flex-1 rounded-input border border-line bg-s2 px-4 text-lg text-text uppercase outline-none focus:border-accent"
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

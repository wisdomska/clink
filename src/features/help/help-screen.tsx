"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Minus, ShieldCheck, Paperclip, X } from "@phosphor-icons/react";
import { Button, IconButton } from "@/components/ui/button";
import { Textarea, FieldError } from "@/components/ui/field";
import { Display } from "@/components/ui/heading";
import { cn } from "@/components/ui/cn";
import { compressImage } from "@/lib/media/compress";
import { FAQS, REPORT_CATEGORIES } from "./faqs";

type View = "faq" | "report" | "sent";

export function HelpScreen({
  signedIn,
  partner,
  startReport,
  fromDark,
}: {
  signedIn: boolean;
  partner: string | null;
  startReport: boolean;
  fromDark: boolean;
}) {
  const router = useRouter();
  const [view, setView] = useState<View>(startReport ? "report" : "faq");
  const [open, setOpen] = useState<number | null>(null);
  const [cat, setCat] = useState<string>("image_misuse");
  const [details, setDetails] = useState("");
  const [paths, setPaths] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function attach(files: FileList) {
    for (const f of Array.from(files).slice(0, 5 - paths.length)) {
      const { blob } = await compressImage(f, 1600);
      const r = await fetch("/api/reports/attachment", {
        method: "POST",
        headers: { "Content-Type": "image/webp" },
        body: blob,
      });
      const d = await r.json();
      if (r.ok) setPaths((p) => [...p, d.path]);
      else setError(d.message);
    }
  }

  async function send() {
    setBusy(true);
    setError(null);
    const r = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: cat,
        details: details || undefined,
        attachmentPaths: paths,
        fromAfterDark: fromDark,
      }),
    });
    setBusy(false);
    if (!r.ok) return setError((await r.json()).message ?? "That didn't send.");
    setView("sent");
  }

  return (
    <main className="an-screen mx-auto flex min-h-dvh w-full max-w-[720px] flex-col gap-4 px-4 pt-[calc(env(safe-area-inset-top)+8px)] pb-10 md:px-8 md:pt-10">
      <div className="flex items-center gap-3">
        <IconButton
          label="Back"
          onClick={() =>
            view === "report"
              ? setView("faq")
              : window.history.length > 1
                ? router.back()
                : router.push(signedIn ? "/settings" : "/")
          }
        >
          <ArrowLeft size={20} />
        </IconButton>
        <Display size={36}>
          Help and <em>safety</em>
        </Display>
      </div>

      {view === "faq" && (
        <>
          <div className="rounded-card border-line bg-s1 overflow-hidden border">
            {FAQS.map((f, i) => (
              <div
                key={f.q}
                className={cn("an-rise", i < FAQS.length - 1 && "border-line border-b")}
                style={{ ["--i" as string]: i }}
              >
                <button
                  type="button"
                  aria-expanded={open === i}
                  aria-controls={`faq-${i}`}
                  onClick={() => setOpen(open === i ? null : i)}
                  className="text-text flex min-h-14 w-full cursor-pointer items-center justify-between gap-3 bg-transparent px-4 py-3.5 text-left text-base leading-[1.35] font-medium"
                >
                  {f.q}
                  {open === i ? (
                    <Minus size={18} className="text-faint flex-none" aria-hidden />
                  ) : (
                    <Plus size={18} className="text-faint flex-none" aria-hidden />
                  )}
                </button>
                {open === i && (
                  <p
                    id={`faq-${i}`}
                    className="an-reveal text-muted m-0 px-4 pb-4 text-base leading-normal"
                  >
                    {f.a}
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="rounded-card bg-s2 flex flex-col gap-2.5 p-[18px]">
            <div className="display text-[22px] tracking-normal">Something wrong?</div>
            <p className="text-muted m-0 text-base leading-normal">
              Reports are private. Anything involving a possible minor suspends the account straight
              away.
            </p>
            {signedIn ? (
              <Button size="md" className="self-start" onClick={() => setView("report")}>
                Report a problem
              </Button>
            ) : (
              <Link
                href="/login?next=/help?report=1"
                className="press bg-accent text-on-accent hover:text-on-accent flex h-12 items-center self-start rounded-full px-5 font-bold"
              >
                Log in to report
              </Link>
            )}
          </div>
          <div className="rounded-card border-line text-muted flex flex-col gap-2 border p-4 text-sm leading-normal">
            <span className="text-text text-base font-bold">If you&apos;re in danger</span>
            Call your local emergency number. In the UK, call 999. In Ghana, call 112. If someone
            shared an intimate image of you without consent, StopNCII.org can help stop it
            spreading.
            <Link href="/safety" className="font-medium">
              Read the safety policy
            </Link>
          </div>
        </>
      )}

      {view === "report" && (
        <div className="an-reveal flex flex-col gap-4">
          <div className="text-muted text-sm font-medium">What&apos;s going on?</div>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Category">
            {REPORT_CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                role="radio"
                aria-checked={cat === c.value}
                onClick={() => setCat(c.value)}
                className="press h-11 cursor-pointer rounded-full border px-4 text-sm font-medium"
                style={{
                  borderColor: cat === c.value ? "var(--accent)" : "var(--line)",
                  background: cat === c.value ? "var(--accent)" : "transparent",
                  color: cat === c.value ? "var(--on-accent)" : "var(--text)",
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
          {cat === "minor_safety" && (
            <p
              role="note"
              className="rounded-input border-danger text-text m-0 border px-4 py-3 text-sm leading-normal"
            >
              Thank you for telling us. The account is suspended as soon as you send this, and our
              safety team follows the legal escalation path.
            </p>
          )}
          <Textarea
            aria-label="What happened"
            className="min-h-[140px]"
            placeholder="Tell us what happened. Only our safety team reads this."
            value={details}
            maxLength={4000}
            onChange={(e) => setDetails(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className="press border-line bg-s2 flex h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-medium">
              <Paperclip size={18} aria-hidden />
              Attach a screenshot
              <input
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => e.target.files && attach(e.target.files)}
              />
            </label>
            {paths.map((p) => (
              <span
                key={p}
                className="bg-s3 flex h-9 items-center gap-1 rounded-full pr-1 pl-3 text-sm"
              >
                Screenshot
                <button
                  type="button"
                  aria-label="Remove screenshot"
                  onClick={() => setPaths((x) => x.filter((y) => y !== p))}
                  className="text-muted flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-transparent"
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
          <p className="text-faint m-0 text-sm">
            Our team only ever sees what you attach here. We can&apos;t read your chats or media.
          </p>
          <FieldError>{error}</FieldError>
          <Button disabled={busy} onClick={send}>
            Send report
          </Button>
        </div>
      )}

      {view === "sent" && (
        <div className="an-reveal flex flex-col gap-3 pt-10">
          <ShieldCheck size={52} className="text-accent" aria-hidden />
          <div className="display text-[28px] leading-[1.05] tracking-normal">
            Got it. We&apos;re on it.
          </div>
          <p className="text-muted m-0 text-base leading-normal">
            We reply within 24 hours. {partner ? `${partner} isn't` : "No one is"} told you reported
            anything.
          </p>
        </div>
      )}
    </main>
  );
}

"use client";
import { useRef, useState } from "react";
import { DownloadSimple, ShareNetwork } from "@phosphor-icons/react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { toast } from "@/components/ui/toast";
import { LogoMark, Wordmark } from "@/components/brand/logo";
import { canShareFiles, captureCard, shareOrSave } from "@/lib/share-image";

export interface CardContent {
  /** artwork under /art, e.g. "fourup" */
  art: string;
  kicker: string;
  headline: string;
  /** big line, e.g. "1 : 0" or "21" */
  big?: string;
  sub?: string;
}

/**
 * A card you can share or save as an image: a preview of exactly what the
 * picture will look like, an option to leave your names off, and the device's
 * own share sheet (or a download).
 */
export function ShareCardSheet({
  open,
  onOpenChange,
  filename,
  content,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  filename: string;
  /** builds the card; `named` is false when names should be left off */
  content: (named: boolean) => CardContent;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [named, setNamed] = useState(true);
  const [busy, setBusy] = useState(false);
  const c = content(named);
  const share = canShareFiles();

  async function go() {
    if (!ref.current) return;
    setBusy(true);
    try {
      const blob = await captureCard(ref.current);
      const r = await shareOrSave(blob, filename, c.headline);
      if (r === "saved") toast.ok("Saved to your downloads.");
      if (r !== "cancelled") onOpenChange(false);
    } catch {
      toast.err("Couldn't make the image. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Share as an image" handle>
      <div className="flex flex-col items-center gap-4 pb-2">
        <div
          ref={ref}
          data-share-card
          className="relative flex aspect-[4/5] w-[288px] flex-col overflow-hidden rounded-[24px] p-6 text-center"
          style={{
            background:
              "radial-gradient(120% 70% at 50% 0%, color-mix(in oklab, var(--accent) 28%, transparent), transparent 70%), var(--bg-night)",
          }}
        >
          <div className="flex items-center justify-center gap-1.5">
            <LogoMark size={20} decorative />
            <Wordmark size={18} />
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/art/${c.art}.webp`} alt="" className="h-20 w-20 object-contain" />
            <div className="mono text-faint text-[11px] tracking-[.14em] uppercase">{c.kicker}</div>
            <div className="display text-text text-[28px] leading-[1.05]">{c.headline}</div>
            {c.big && (
              <div className="mono text-[44px] leading-none text-[var(--champagne)]">{c.big}</div>
            )}
            {c.sub && <div className="text-muted text-sm leading-snug">{c.sub}</div>}
          </div>
          <div className="text-faint mono text-[10px] tracking-[.12em]">CLINKAPP.VERCEL.APP</div>
        </div>
        <div className="w-full max-w-[360px]">
          <Toggle
            label="Show our names"
            sub="Off: the card says “me” and “them”."
            checked={named}
            onChange={setNamed}
            last
          />
        </div>
        <Button className="w-full max-w-[360px]" loading={busy} onClick={go}>
          {share ? (
            <ShareNetwork size={20} aria-hidden />
          ) : (
            <DownloadSimple size={20} aria-hidden />
          )}
          {share ? "Share" : "Save image"}
        </Button>
      </div>
    </Sheet>
  );
}

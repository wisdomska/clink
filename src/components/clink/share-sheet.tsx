"use client";
import { useState } from "react";
import {
  ChatCircleDots,
  Envelope,
  LinkSimple,
  DotsThreeOutline,
  Check,
} from "@phosphor-icons/react";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import { feedback } from "@/lib/feedback";
import { BrandLogo, type Brand } from "./brand-logo";

type Target = {
  key: string;
  label: string;
  brand?: Brand;
  icon?: React.ReactNode;
  /** Opens this URL. */
  href?: (text: string, url: string) => string;
  /** Apps with no "share text" link: copy first, then open the app. */
  copyThen?: string;
  mobileOnly?: boolean;
};

const enc = encodeURIComponent;

const TARGETS: Target[] = [
  {
    key: "whatsapp",
    label: "WhatsApp",
    brand: "whatsapp",
    href: (t) => `https://wa.me/?text=${enc(t)}`,
  },
  {
    key: "instagram",
    label: "Instagram",
    brand: "instagram",
    copyThen: "https://www.instagram.com/direct/inbox/",
  },
  {
    key: "snapchat",
    label: "Snapchat",
    brand: "snapchat",
    href: (_t, u) => `https://www.snapchat.com/share?link=${enc(u)}`,
  },
  {
    key: "telegram",
    label: "Telegram",
    brand: "telegram",
    href: (t, u) => `https://t.me/share/url?url=${enc(u)}&text=${enc(t.replace(u, "").trim())}`,
  },
  {
    key: "messenger",
    label: "Messenger",
    brand: "messenger",
    href: (_t, u) => `fb-messenger://share/?link=${enc(u)}`,
    mobileOnly: true,
  },
  { key: "x", label: "X", brand: "x", href: (t) => `https://x.com/intent/post?text=${enc(t)}` },
  {
    key: "sms",
    label: "Messages",
    icon: <ChatCircleDots size={26} weight="fill" aria-hidden />,
    href: (t) => `sms:?&body=${enc(t)}`,
    mobileOnly: true,
  },
  {
    key: "email",
    label: "Email",
    icon: <Envelope size={26} weight="fill" aria-hidden />,
    href: (t) => `mailto:?subject=${enc("Link with me on Clink")}&body=${enc(t)}`,
  },
];

/**
 * "Share link" menu: every common app with its official mark, plus the
 * device's own share sheet and Copy. Apps without a share-text link
 * (Instagram) get the link copied, then open straight to their inbox.
 */
export function ShareSheet({
  open,
  onOpenChange,
  title = "Share link",
  text,
  url,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title?: string;
  text: string;
  url: string;
}) {
  const [copied, setCopied] = useState(false);
  // The sheet's contents only mount once it opens (client side), so reading the
  // device here is safe and needs no effect.
  const mobile = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  const native = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  };

  const tiles = TARGETS.filter((t) => !t.mobileOnly || mobile);

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title} handle>
      <div className="display mb-1 text-[28px]">{title}</div>
      <p className="text-muted m-0 mb-4 truncate text-sm">{url}</p>
      <ul className="m-0 grid list-none grid-cols-4 gap-x-2 gap-y-4 p-0">
        {tiles.map((t) => (
          <li key={t.key}>
            <a
              href={t.href ? t.href(text, url) : t.copyThen}
              target={t.href?.(text, url).startsWith("http") || t.copyThen ? "_blank" : undefined}
              rel="noopener noreferrer"
              onClick={async () => {
                feedback("tap");
                if (t.copyThen) {
                  const ok = await copy();
                  toast(
                    ok
                      ? `Link copied. Paste it in your ${t.label} chat.`
                      : "Open the app and paste your link.",
                  );
                }
              }}
              className="press text-text hover:text-text flex flex-col items-center gap-1.5 text-center text-xs font-medium"
            >
              {t.brand ? (
                <BrandLogo brand={t.brand} variant="tile" size={56} />
              ) : (
                <span className="bg-s3 text-text flex h-14 w-14 items-center justify-center rounded-[28%]">
                  {t.icon}
                </span>
              )}
              {t.label}
            </a>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={async () => {
              const ok = await copy();
              feedback(ok ? "success" : "error", ok ? "success" : undefined);
              setCopied(ok);
              toast(ok ? "Link copied." : "Couldn't copy. Press and hold the link to copy it.");
            }}
            className="press text-text flex w-full cursor-pointer flex-col items-center gap-1.5 border-0 bg-transparent p-0 text-xs font-medium"
          >
            <span className="bg-accent text-on-accent flex h-14 w-14 items-center justify-center rounded-[28%]">
              {copied ? (
                <Check size={26} weight="bold" aria-hidden />
              ) : (
                <LinkSimple size={26} weight="bold" aria-hidden />
              )}
            </span>
            {copied ? "Copied" : "Copy link"}
          </button>
        </li>
        {native && (
          <li>
            <button
              type="button"
              onClick={() => navigator.share({ text, url }).catch(() => undefined)}
              className="press text-text flex w-full cursor-pointer flex-col items-center gap-1.5 border-0 bg-transparent p-0 text-xs font-medium"
            >
              <span className="bg-s3 text-text flex h-14 w-14 items-center justify-center rounded-[28%]">
                <DotsThreeOutline size={26} weight="fill" aria-hidden />
              </span>
              More
            </button>
          </li>
        )}
      </ul>
    </Sheet>
  );
}

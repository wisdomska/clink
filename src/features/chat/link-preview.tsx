"use client";
import { useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { splitLinks, firstLink } from "@/lib/links";
import { cn } from "@/components/ui/cn";

type Card = {
  ok: boolean;
  title?: string | null;
  description?: string | null;
  site?: string | null;
  image?: string | null;
};

const stop = (e: React.SyntheticEvent) => e.stopPropagation();

/** Message text with its web links tappable (opened in a new tab, no referrer). */
export function LinkedText({ text }: { text: string }) {
  return (
    <>
      {splitLinks(text).map((p, i) =>
        p.href ? (
          <a
            key={i}
            href={p.href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            onPointerDown={stop}
            onClick={stop}
            className="underline decoration-current/40 underline-offset-2 hover:decoration-current"
          >
            {p.text}
          </a>
        ) : (
          p.text
        ),
      )}
    </>
  );
}

/**
 * A preview card for the first link in a message: title, site and a small
 * picture, all fetched by Clink's server, so this device never contacts the
 * site until you tap. Never shown in After Dark.
 */
export function LinkPreview({ text, mine }: { text: string | null | undefined; mine: boolean }) {
  const path = usePathname();
  const url = firstLink(text);
  const off = !url || path.startsWith("/dark");
  const { data } = useQuery({
    queryKey: ["link-preview", url],
    enabled: !off,
    staleTime: Infinity,
    gcTime: 30 * 60_000,
    retry: false,
    queryFn: async (): Promise<Card> => {
      const r = await fetch(`/api/link-preview?url=${encodeURIComponent(url!)}`);
      return r.ok ? r.json() : { ok: false };
    },
  });
  const ref = useRef<HTMLAnchorElement>(null);
  const show = !off && data?.ok;
  // The chat keeps itself pinned to the newest message when things load in.
  useLayoutEffect(() => {
    if (show) ref.current?.dispatchEvent(new Event("load"));
  }, [show]);
  if (!show || !data) return null;
  return (
    <a
      ref={ref}
      href={url!}
      target="_blank"
      rel="noopener noreferrer nofollow"
      onPointerDown={stop}
      onClick={stop}
      aria-label={`Link: ${data.title}${data.site ? `, ${data.site}` : ""}`}
      className={cn(
        "press text-text hover:text-text mt-1.5 mb-1 flex max-w-[320px] overflow-hidden rounded-[12px] border no-underline",
        mine ? "border-white/10 bg-black/20" : "border-line bg-s2",
      )}
    >
      {data.image && (
        // A tiny inline picture made by the server: nothing loads from the site.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={data.image}
          alt=""
          className="h-auto w-[84px] flex-none self-stretch object-cover"
          draggable={false}
        />
      )}
      <span className="flex min-w-0 flex-col gap-0.5 px-3 py-2 whitespace-normal">
        <span className="text-faint truncate text-[11px] font-semibold tracking-wide uppercase">
          {data.site}
        </span>
        <span className="line-clamp-2 text-sm leading-snug font-semibold">{data.title}</span>
        {data.description && (
          <span className="text-muted line-clamp-2 text-xs leading-snug">{data.description}</span>
        )}
      </span>
    </a>
  );
}

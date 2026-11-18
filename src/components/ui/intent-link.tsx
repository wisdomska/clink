"use client";
import { forwardRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types";

type Props = React.ComponentProps<typeof Link> & { href: string };

/**
 * A link that loads its screen the moment you reach for it (finger down,
 * pointer over, keyboard focus) instead of as soon as it's on screen.
 *
 * Prefetching every visible link made one app open cost 15 to 20 server
 * renders. The main tabs still prefetch on sight (prefetch={true});
 * everything else uses this, which still has the screen ready by the time
 * the tap lands. "@/components/ui/link" makes it the app's default Link.
 */
export const IntentLink = forwardRef<HTMLAnchorElement, Props>(function IntentLink(
  { href, prefetch, onPointerEnter, onTouchStart, onFocus, ...rest },
  ref,
) {
  const router = useRouter();
  const warm = useCallback(
    () => router.prefetch(href, { kind: "full" as PrefetchKind }),
    [router, href],
  );
  // prefetch={true} keeps loading on sight (the main tabs); false turns it off entirely.
  if (prefetch === true || prefetch === false)
    return (
      <Link
        ref={ref}
        href={href}
        prefetch={prefetch}
        onPointerEnter={onPointerEnter}
        onTouchStart={onTouchStart}
        onFocus={onFocus}
        {...rest}
      />
    );
  return (
    <Link
      ref={ref}
      href={href}
      prefetch={false}
      onPointerEnter={(e) => {
        warm();
        onPointerEnter?.(e);
      }}
      onTouchStart={(e) => {
        warm();
        onTouchStart?.(e);
      }}
      onFocus={(e) => {
        warm();
        onFocus?.(e);
      }}
      {...rest}
    />
  );
});

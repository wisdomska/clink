"use client";
import { useEffect } from "react";
import { allowedInPrivate, setPrivateMode } from "@/lib/private-mode";

/**
 * While After Dark is open: no request may go to an outside site (enforced in
 * the app's fetch wrapper, see offline-saves), and any outside frame, script
 * or embed that appears on the page is removed at once. Same rule as After
 * Dark's own security policy, which only applies when it's loaded directly.
 */
export function DarkGuard() {
  useEffect(() => {
    setPrivateMode(true);
    const outside = (src: string | null) => {
      if (!src) return false;
      try {
        return !allowedInPrivate(new URL(src, window.location.href));
      } catch {
        return true;
      }
    };
    const sweep = (root: ParentNode) => {
      root.querySelectorAll("iframe, script[src], embed, object").forEach((el) => {
        const src =
          el.getAttribute("src") ??
          el.getAttribute("data") ??
          (el.tagName === "IFRAME" ? "" : null);
        if (el.tagName === "IFRAME" ? outside(src || "about:blank") || !src : outside(src))
          el.remove();
      });
    };
    sweep(document);
    const obs = new MutationObserver((list) => {
      for (const m of list)
        m.addedNodes.forEach((n) => {
          if (n instanceof Element) {
            if (n.matches("iframe, script[src], embed, object")) sweep(n.parentNode ?? document);
            else sweep(n);
          }
        });
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
    return () => {
      obs.disconnect();
      setPrivateMode(false);
    };
  }, []);
  return null;
}

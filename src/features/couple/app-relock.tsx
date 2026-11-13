"use client";

import { useEffect } from "react";

const AWAY_MS = 5 * 60 * 1000;

/** CHAT-07: with a PIN on, Clink relocks after 5 minutes in the background. */
export function AppRelock() {
  useEffect(() => {
    let hiddenAt = 0;
    const onChange = async () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        return;
      }
      if (hiddenAt && Date.now() - hiddenAt > AWAY_MS) {
        await fetch("/api/me/app-lock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "lock" }),
        });
        const here = window.location.pathname + window.location.search;
        window.location.assign(`/unlock?next=${encodeURIComponent(here)}`);
      }
      hiddenAt = 0;
    };
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);
  return null;
}

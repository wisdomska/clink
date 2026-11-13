"use client";
import { useEffect, useState } from "react";
import { ArrowsClockwise } from "@phosphor-icons/react";

/** Registers the service worker and shows the update-available banner. */
export function ServiceWorker() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    });
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).then((reg) => {
      if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting);
      reg.addEventListener("updatefound", () => {
        const sw = reg.installing;
        sw?.addEventListener("statechange", () => {
          if (sw.state === "installed" && navigator.serviceWorker.controller) setWaiting(sw);
        });
      });
      const t = setInterval(() => reg.update().catch(() => undefined), 30 * 60 * 1000);
      return () => clearInterval(t);
    });
  }, []);
  if (!waiting) return null;
  return (
    <div role="status" className="an-slide-down fixed inset-x-3 top-[calc(env(safe-area-inset-top)+8px)] z-[75] mx-auto flex max-w-[480px] items-center gap-3 rounded-card border border-line bg-s1 px-4 py-3" style={{ boxShadow: "var(--shadow-float)" }}>
      <ArrowsClockwise size={20} className="text-accent" aria-hidden />
      <span className="flex-1 text-sm font-medium">A fresh version of Clink is ready.</span>
      <button
        type="button"
        onClick={() => waiting.postMessage({ type: "SKIP_WAITING" })}
        className="press h-11 cursor-pointer rounded-full border-0 bg-accent px-4 text-sm font-bold text-on-accent"
      >
        Update
      </button>
    </div>
  );
}

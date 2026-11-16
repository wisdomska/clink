"use client";
import { useEffect } from "react";

/**
 * Registers the service worker and keeps Clink current without asking:
 * new versions install and take over on their own (skipWaiting), so a
 * refresh always shows the latest. An open tab isn't reloaded under you;
 * it switches over quietly the next time you come back to the app.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    let hadController = Boolean(navigator.serviceWorker.controller);
    let pending = false;
    const reloadIfPending = () => {
      if (pending && document.visibilityState === "visible") window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      // The very first install also fires this; nothing to refresh then.
      if (!hadController) {
        hadController = true;
        return;
      }
      pending = true;
      if (document.visibilityState === "hidden") window.location.reload();
    });
    document.addEventListener("visibilitychange", reloadIfPending);

    // A stale tab can ask for code the new version no longer has: reload once.
    const onChunkError = (e: PromiseRejectionEvent | ErrorEvent) => {
      const msg = String(("reason" in e ? e.reason?.message : e.message) ?? "");
      if (/ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module/.test(msg)) {
        if (!sessionStorage.getItem("clink.chunkReload")) {
          sessionStorage.setItem("clink.chunkReload", "1");
          window.location.reload();
        }
      }
    };
    window.addEventListener("unhandledrejection", onChunkError);
    window.addEventListener("error", onChunkError);

    let timer: ReturnType<typeof setInterval> | undefined;
    let checkOnReturn: (() => void) | undefined;
    // Register once the page has loaded, so the worker's install (precaching)
    // never competes with the first screen's own requests.
    const register = () =>
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).then((reg) => {
        void reg.update().catch(() => undefined);
        timer = setInterval(() => reg.update().catch(() => undefined), 15 * 60 * 1000);
        checkOnReturn = () => {
          if (document.visibilityState === "visible") void reg.update().catch(() => undefined);
        };
        document.addEventListener("visibilitychange", checkOnReturn);
      });
    if (document.readyState === "complete") void register();
    else window.addEventListener("load", () => void register(), { once: true });
    return () => {
      if (timer) clearInterval(timer);
      if (checkOnReturn) document.removeEventListener("visibilitychange", checkOnReturn);
      document.removeEventListener("visibilitychange", reloadIfPending);
      window.removeEventListener("unhandledrejection", onChunkError);
      window.removeEventListener("error", onChunkError);
    };
  }, []);
  return null;
}

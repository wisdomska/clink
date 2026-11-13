"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const IDLE_MS = 2 * 60 * 1000;

/** DARK-01: auto-lock after 2 minutes idle. Activity slides the server session every 30 s. */
export function DarkIdle() {
  const router = useRouter();
  const last = useRef(0);
  const lastPing = useRef(0);
  useEffect(() => {
    last.current = Date.now();
    const touch = () => {
      last.current = Date.now();
      if (Date.now() - lastPing.current > 30_000) {
        lastPing.current = Date.now();
        void fetch("/api/dark/ping", { method: "POST" }).then(
          (r) => r.status === 401 && router.replace("/dark"),
        );
      }
    };
    const lock = () => {
      void fetch("/api/dark/lock", { method: "POST" });
      router.replace("/dark");
    };
    const check = setInterval(() => Date.now() - last.current >= IDLE_MS && lock(), 5000);
    const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    const onVis = () => {
      if (document.visibilityState === "visible" && Date.now() - last.current >= IDLE_MS) lock();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(check);
      events.forEach((e) => window.removeEventListener(e, touch));
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [router]);
  return null;
}

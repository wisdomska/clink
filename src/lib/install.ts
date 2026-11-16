"use client";
import { useSyncExternalStore } from "react";
import { isStandalone } from "@/lib/pwa";

/**
 * The browser's install prompt fires once, often before the user reaches the
 * screen that offers "Add to home screen". Catch it early (installCapture() runs
 * from the root service worker component) and keep it here for any screen.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
let started = false;

export function installCapture() {
  if (started || typeof window === "undefined") return;
  started = true;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferred = null;
    emit();
  });
}

type State = "installed" | "prompt" | "manual";
let snap: State = "manual";
function read(): State {
  const next: State = installed || isStandalone() ? "installed" : deferred ? "prompt" : "manual";
  snap = next;
  return snap;
}

/** "installed": already on the home screen; "prompt": one tap to install; "manual": show steps. */
export function useInstallState(): State {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    read,
    () => "manual",
  );
}

/** Shows the browser's install dialog. Resolves to true if they installed. */
export async function promptInstall(): Promise<boolean> {
  const e = deferred;
  if (!e) return false;
  await e.prompt();
  const { outcome } = await e.userChoice;
  deferred = null;
  if (outcome === "accepted") installed = true;
  emit();
  return outcome === "accepted";
}

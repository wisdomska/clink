"use client";
import { useSyncExternalStore } from "react";
import { useReducedMotion } from "@/lib/feedback";

const noop = () => () => {};
const automated = () => typeof navigator !== "undefined" && navigator.webdriver === true;

/**
 * True when decorative loops should hold still: reduced motion (system or the
 * in-app switch), or an automated browser taking screenshots and audits.
 */
export function useStill(): boolean {
  const reduced = useReducedMotion();
  const bot = useSyncExternalStore(noop, automated, () => false);
  return reduced || bot;
}

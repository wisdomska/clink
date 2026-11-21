import "server-only";
import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Screens and APIs whose errors are never recorded (see sentry-options). */
const PRIVATE = /^\/(dark|api\/dark|api\/media|admin|api\/admin)(\/|$)/;

export function isPrivatePath(path: string) {
  return PRIVATE.test(path);
}

/** Just the path: no query string, no fragment, ids collapsed so repeats group. */
export function cleanPath(raw: string | undefined | null): string {
  if (!raw) return "";
  let p = raw;
  try {
    p = new URL(raw, "http://x").pathname;
  } catch {
    p = raw.split(/[?#]/)[0] ?? "";
  }
  return p
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ":id")
    .slice(0, 200);
}

/** Stack frames only, without query strings or long data. */
function cleanStack(stack: string | undefined | null) {
  if (!stack) return null;
  return stack
    .split("\n")
    .slice(0, 25)
    .map((l) => l.replace(/\?[^\s):]*/g, "").slice(0, 300))
    .join("\n");
}

/**
 * Errors that mean nothing went wrong for anyone: the browser cancelling a
 * screen-change animation because the app went to the background, or a
 * playback start interrupted by a pause. Kept out so real ones stand out.
 */
const HARMLESS = [
  /^Transition was aborted because of invalid state/i,
  /^Transition was skipped/i,
  /The play\(\) request was interrupted by a call to pause\(\)/i,
  /^AbortError: The operation was aborted/i,
  /^ResizeObserver loop/i,
];
export const isHarmless = (message: string) => HARMLESS.some((r) => r.test(message));

export async function logError(e: {
  source: "client" | "server";
  message: string;
  stack?: string | null;
  path?: string | null;
  userAgent?: string | null;
}) {
  const path = cleanPath(e.path);
  if (path && isPrivatePath(path)) return;
  if (isHarmless(e.message ?? "")) return;
  const message = (e.message || "Unknown error").replace(/\s+/g, " ").slice(0, 500);
  const stack = cleanStack(e.stack);
  // Same message from the same place counts as the same error.
  const firstFrame = stack?.split("\n").find((l) => l.includes("at ")) ?? "";
  const fingerprint = createHash("sha256")
    .update(`${e.source}|${message}|${firstFrame.replace(/:\d+:\d+/g, "")}`)
    .digest("hex")
    .slice(0, 32);
  try {
    await supabaseAdmin().rpc("svc_log_error", {
      p_fingerprint: fingerprint,
      p_source: e.source,
      p_message: message,
      p_stack: stack ?? "",
      p_path: path,
      p_release: (process.env.VERCEL_GIT_COMMIT_SHA ?? "local").slice(0, 7),
      p_user_agent: (e.userAgent ?? "").slice(0, 200),
    });
  } catch {
    /* logging must never break the request */
  }
}

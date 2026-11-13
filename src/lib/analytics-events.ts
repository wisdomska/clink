/**
 * Spec section 16: behaviour, never content. Only these events and these
 * property keys can leave the app; anything else is dropped.
 */
export const EVENTS = {
  signup_completed: ["method"],
  couple_linked: ["minutes_since_signup"],
  pwa_installed: ["platform"],
  clink_sent: ["kind"],
  clink_answered: ["kind", "answered_within_s"],
  activity_completed: ["type", "mode"],
  message_sent: ["type"],
  dark_tier_unlocked: ["tier"],
  dare_outcome: ["tier", "outcome"],
  sensitive_media_sent: ["retention"],
  report_submitted: ["category"],
} as const;

export type EventName = keyof typeof EVENTS;

export function sanitizeEvent(
  name: string,
  props: Record<string, unknown> = {},
): { name: EventName; props: Record<string, string | number | boolean> } | null {
  if (!(name in EVENTS)) return null;
  const allowed = EVENTS[name as EventName] as readonly string[];
  const clean: Record<string, string | number | boolean> = {};
  for (const k of allowed) {
    const v = props[k];
    if (typeof v === "number" || typeof v === "boolean") clean[k] = v;
    else if (typeof v === "string" && v.length <= 32 && /^[a-z0-9_ -]+$/i.test(v)) clean[k] = v;
  }
  return { name: name as EventName, props: clean };
}

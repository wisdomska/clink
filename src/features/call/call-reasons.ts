/**
 * Why a call didn't happen or ended early, recorded with the call log
 * ("call:<outcome>:<kind>:<seconds>:<reason>") and shown to both people.
 * Plain facts only, never blame.
 */
export const CALL_REASONS = [
  "offline",
  "notified",
  "no-answer",
  "no-path",
  "lost",
  "away",
] as const;
export type CallReason = (typeof CALL_REASONS)[number];

export const isCallReason = (r: unknown): r is CallReason =>
  typeof r === "string" && (CALL_REASONS as readonly string[]).includes(r);

/** On the caller's screen, the moment it ends. */
export function endedDetailMessage(detail: string | null, name: string): string | null {
  switch (detail) {
    case "offline":
      return `${name}'s device seems to be offline. They'll see they missed you.`;
    case "notified":
      return `No answer. ${name} got a notification.`;
    case "no-answer":
      return `It rang on ${name}'s device, but no answer.`;
    case "no-path":
      return "Couldn't connect your networks. Try Wi-Fi on both sides, or call again.";
    case "lost":
      return "The connection dropped. Call again when you're both on a steadier network.";
    case "away":
      return `${name} left Clink and didn't come back, so the call ended.`;
    default:
      return null;
  }
}

/** The line under a call in the chat, from either side. */
export function callLogReason(
  reason: string | null | undefined,
  mine: boolean,
  name: string,
): string | null {
  switch (reason) {
    case "offline":
      return mine ? `${name}'s device was offline` : "Your device was offline";
    case "notified":
      return mine ? `${name} was notified` : "You were sent a notification";
    case "no-answer":
      return mine ? `Rang on ${name}'s device` : "It rang on your device";
    case "no-path":
      return "Your networks couldn't connect";
    case "lost":
      return "The connection dropped";
    case "away":
      return mine ? `${name} left Clink` : "You left Clink";
    default:
      return null;
  }
}

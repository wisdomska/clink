/**
 * Chat notifications stack into one: "3 new messages from Theo" with the
 * newest line under it, instead of each one silently replacing the last.
 * Discreet notifications (no previews) only count, never name or quote.
 */
export function groupMessage(
  prevCount: number | undefined,
  push: { body: string; from?: string },
): { body: string; count: number } {
  const count = (prevCount ?? 0) + 1;
  if (count === 1) return { body: push.body, count };
  if (!push.from) return { body: `${count} new messages`, count };
  // "Theo: see you at 8" reads as just the line under "... from Theo".
  const line = push.body.startsWith(`${push.from}: `)
    ? push.body.slice(push.from.length + 2)
    : push.body;
  return { body: `${count} new messages from ${push.from}\n${line}`, count };
}

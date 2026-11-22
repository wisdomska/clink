"use client";
/**
 * Everything this browser keeps on its own (unsent messages, look and feel,
 * recent emoji, dismissed banners, what you've seen) belongs to one account.
 * With several accounts on one device, keys carry the signed-in user's id, and
 * switching to a different account wipes the offline page cache, so one
 * account's content can never show up while you're using another.
 */
let uid: string | null = null;
const LAST = "clink.lastUser";
/** Caches that hold signed-in pages or data. Static assets stay. */
const USER_CACHES = /^(pages|apis|next-data|others|cross-origin)/;

export function scopeUser(): string | null {
  return uid;
}

/** "clink.recentEmoji.v1" -> "clink.recentEmoji.v1:<user id>". */
export function scoped(base: string): string {
  return uid ? `${base}:${uid}` : base;
}

/** Drop every cached page and API response (used on any account change). */
export async function clearUserCaches(): Promise<void> {
  // The Us cards' saved answers (features/couple/query-persist).
  try {
    for (const k of Object.keys(localStorage))
      if (k.startsWith("clink-q:")) localStorage.removeItem(k);
  } catch {
    /* storage blocked */
  }
  if (typeof caches === "undefined") return;
  try {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => USER_CACHES.test(k)).map((k) => caches.delete(k)));
  } catch {
    /* caches unavailable: nothing stored to leak */
  }
}

/**
 * Called once the signed-in user is known. Returns true when this device was
 * last used by a different account (so callers can reset per-device state).
 */
export function enterAccount(id: string): boolean {
  uid = id;
  let changed = false;
  try {
    changed = localStorage.getItem(LAST) !== id;
    localStorage.setItem(LAST, id);
    // Old unscoped keys could belong to either account: never reuse them.
    for (const k of ["clink_outbox", "clink.missedSeen", "clink.recentEmoji.v1", "clink_banners"])
      localStorage.removeItem(k);
  } catch {
    /* storage blocked */
  }
  if (changed) void clearUserCaches();
  return changed;
}

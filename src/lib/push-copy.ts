/** Notification copy rules (spec 13.4). Pure, unit-tested. */

export type PushCategory = "clinks" | "chat" | "games" | "dates" | "keepsakes" | "dark";

export interface PushPrefs {
  clinks?: boolean;
  chat?: boolean;
  games?: boolean;
  dates?: boolean;
  keepsakes?: boolean;
  dark?: boolean;
  detailed?: boolean;
}

export const DARK_TEXT = "Something's waiting for you";
export const DISCREET_TEXT = "New moment in Clink";

/**
 * After Dark never carries content, names of dares or the word "nude".
 * Everything else is discreet unless the user opted into detailed text.
 */
export function pushText(
  category: PushCategory,
  detailed: string,
  prefs: PushPrefs,
  appName = "Clink",
): { title: string; body: string } {
  if (category === "dark") return { title: appName, body: DARK_TEXT };
  if (!prefs.detailed) return { title: appName, body: DISCREET_TEXT };
  return { title: appName, body: detailed };
}

export function categoryEnabled(category: PushCategory, prefs: PushPrefs): boolean {
  const v = prefs[category];
  return category === "dark" ? v === true : v !== false;
}

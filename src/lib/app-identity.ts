/** Discreet app identity (SET-02). */
export const IDENTITIES = {
  clink: { name: "Clink", short: "Clink", label: "Clink" },
  notes: { name: "Notes", short: "Notes", label: "Notes" },
  weather: { name: "Weather", short: "Weather", label: "Weather" },
} as const;
export type Identity = keyof typeof IDENTITIES;
export const IDENTITY_COOKIE = "clink_icon";
export function asIdentity(v: string | undefined | null): Identity {
  return v === "notes" || v === "weather" ? v : "clink";
}

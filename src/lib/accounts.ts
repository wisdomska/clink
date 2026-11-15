"use client";
import { supabaseBrowser } from "@/lib/supabase/client";

/**
 * Several Clink accounts signed in on one device (like Instagram's account
 * switcher). Each saved account keeps its latest refresh token in this
 * browser's storage, the same place Supabase already keeps the active one.
 * The active account's token is re-saved right before every switch, so a
 * stale (already rotated) token is never replayed.
 */
export interface SavedAccount {
  id: string;
  email: string;
  name: string;
  photoUrl: string | null;
  refreshToken: string;
  savedAt: number;
}

const KEY = "clink.accounts.v1";
export const MAX_ACCOUNTS = 5;

function read(): SavedAccount[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as SavedAccount[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function write(list: SavedAccount[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_ACCOUNTS)));
  } catch {
    /* storage blocked: switching just isn't offered */
  }
}

export function savedAccounts() {
  return read();
}

/** Save (or refresh) the account that is signed in right now. */
export async function rememberCurrent(profile: { name: string; photoUrl: string | null }) {
  const { data } = await supabaseBrowser().auth.getSession();
  const s = data.session;
  if (!s?.user?.email) return null;
  const entry: SavedAccount = {
    id: s.user.id,
    email: s.user.email,
    name: profile.name,
    photoUrl: profile.photoUrl,
    refreshToken: s.refresh_token,
    savedAt: Date.now(),
  };
  write([entry, ...read().filter((a) => a.id !== entry.id)]);
  return entry;
}

export function forget(id: string) {
  write(read().filter((a) => a.id !== id));
}

async function park() {
  await fetch("/api/auth/park", { method: "POST" });
}

/** Keep this account saved and open the sign-in screen for another one. */
export async function addAnother(profile: { name: string; photoUrl: string | null }) {
  await rememberCurrent(profile);
  await park();
  window.location.assign("/login?add=1");
}

/** Switch to a saved account. Returns false if its sign-in has expired. */
export async function switchTo(id: string, profile: { name: string; photoUrl: string | null }) {
  const target = read().find((a) => a.id === id);
  if (!target) return false;
  await rememberCurrent(profile);
  await park();
  const { data, error } = await supabaseBrowser().auth.refreshSession({
    refresh_token: target.refreshToken,
  });
  if (error || !data.session) {
    forget(id);
    window.location.assign(`/login?expired=${encodeURIComponent(target.email)}`);
    return false;
  }
  write(
    read().map((a) =>
      a.id === id ? { ...a, refreshToken: data.session!.refresh_token, savedAt: Date.now() } : a,
    ),
  );
  window.location.assign("/us");
  return true;
}

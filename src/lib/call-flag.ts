"use client";
/**
 * Whether a call is in progress on this page. Anything that would reload the
 * page (a new app version taking over, a stale chunk) checks this first and
 * waits, because a reload hangs up.
 */
let active = false;
const waiters = new Set<() => void>();

export function setCallActive(v: boolean) {
  if (active === v) return;
  active = v;
  if (!v) for (const fn of [...waiters]) fn();
}

export function inCall() {
  return active;
}

/** Runs `fn` once no call is in progress (straight away if none is). */
export function whenNoCall(fn: () => void) {
  if (!active) return fn();
  const once = () => {
    waiters.delete(once);
    fn();
  };
  waiters.add(once);
}

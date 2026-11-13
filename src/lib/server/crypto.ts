import "server-only";
import { createHmac, createHash, timingSafeEqual, randomInt } from "node:crypto";
import { serverEnv } from "@/lib/env";

export function hmac(value: string, purpose: string): string {
  return createHmac("sha256", `${serverEnv().APP_SECRET}:${purpose}`).update(value).digest("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** value.signature, verified in constant time. */
export function sign(value: string, purpose: string): string {
  return `${Buffer.from(value).toString("base64url")}.${hmac(value, purpose)}`;
}

export function unsign(token: string | undefined, purpose: string): string | null {
  if (!token) return null;
  const [b64, sig] = token.split(".");
  if (!b64 || !sig) return null;
  const value = Buffer.from(b64, "base64url").toString();
  const expected = Buffer.from(hmac(value, purpose));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return value;
}

/** 6-char invite code without ambiguous characters (no I, O, 0, 1). */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function inviteCode(): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return s;
}

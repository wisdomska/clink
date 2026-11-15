import "server-only";
import { cookies } from "next/headers";
import { randomBytes, scrypt as _scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sign, unsign } from "@/lib/server/crypto";

const scrypt = promisify(_scrypt) as (
  p: string,
  s: Buffer,
  len: number,
  o: object,
) => Promise<Buffer>;
const PARAMS = { N: 16384, r: 8, p: 1 };
export const ADMIN_COOKIE = "clink_admin";
const SESSION_HOURS = 12;

/** scrypt$N$r$p$salt$hash, all base64url. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 32, PARAMS);
  return `scrypt$${PARAMS.N}$${PARAMS.r}$${PARAMS.p}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [alg, N, r, p, salt, hash] = stored.split("$");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const key = await scrypt(password, Buffer.from(salt, "base64url"), 32, {
    N: Number(N),
    r: Number(r),
    p: Number(p),
  });
  const want = Buffer.from(hash, "base64url");
  return want.length === key.length && timingSafeEqual(want, key);
}

export interface AdminAccount {
  id: string;
  email: string;
  name: string;
  must_change_password: boolean;
  session_version: number;
  user_id: string | null;
}

/** Start an admin session: httpOnly, strict, 12 hours, tied to the session version. */
export async function startAdminSession(a: { id: string; session_version: number }) {
  const exp = Date.now() + SESSION_HOURS * 3600 * 1000;
  (await cookies()).set(ADMIN_COOKIE, sign(`${a.id}|${a.session_version}|${exp}`, "admin"), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
}

export async function endAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}

/** The admin signed into the portal on this device, or null. */
export async function currentAdmin(): Promise<AdminAccount | null> {
  const raw = unsign((await cookies()).get(ADMIN_COOKIE)?.value, "admin");
  if (!raw) return null;
  const [id, ver, exp] = raw.split("|");
  if (!id || Number(exp) < Date.now()) return null;
  const { data } = await supabaseAdmin()
    .from("admin_accounts")
    .select("id, email, name, must_change_password, session_version, user_id")
    .eq("id", id)
    .maybeSingle();
  if (!data || data.session_version !== Number(ver)) return null;
  return data;
}

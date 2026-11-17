import { createClient } from "@supabase/supabase-js";
import type { Browser, BrowserContext, Page } from "@playwright/test";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
export const admin = createClient(url, service, { auth: { persistSession: false } });

export interface TestUser {
  id: string;
  email: string;
  name: string;
}

/** Creates a confirmed, onboarded 18+ user directly through the admin API. */
export async function makeUser(
  name: string,
  opts: { city?: string; timezone?: string; onboarded?: boolean } = {},
): Promise<TestUser> {
  const email = `${name.toLowerCase()}-${randomUUID().slice(0, 8)}@clink.test`;
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("createUser failed");
  const id = data.user.id;
  await admin.from("user_private").insert({ user_id: id, dob: "1996-03-14" });
  if (opts.onboarded !== false) {
    await admin
      .from("profiles")
      .update({
        display_name: name,
        home_city: opts.city ?? "London",
        country: "United Kingdom",
        timezone: opts.timezone ?? "Europe/London",
        latitude: 51.5,
        longitude: -0.12,
        onboarded_at: new Date().toISOString(),
      })
      .eq("id", id);
  }
  return { id, email, name };
}

/** Signs a browser context in through a real magic link (token hash). */
export async function signIn(page: Page, user: TestUser, next = "/us") {
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: user.email,
  });
  if (error) throw error;
  const hash = data.properties.hashed_token;
  await page.goto(
    `/auth/callback?token_hash=${hash}&type=magiclink&next=${encodeURIComponent(next)}`,
  );
}

/** Links two users as a couple through the real invite + accept API. */
export async function linkCouple(a: Page, b: Page, bUser: TestUser) {
  const res = await a.request.post("/api/invites");
  const { code } = await res.json();
  const acc = await b.request.post("/api/invites/accept", { data: { code } });
  if (!acc.ok()) throw new Error(`accept failed: ${await acc.text()}`);
  return { code, bUser };
}

export async function twoPartners(browser: Browser, contextOptions = {}) {
  const ctxA: BrowserContext = await browser.newContext(contextOptions);
  const ctxB: BrowserContext = await browser.newContext(contextOptions);
  const a = await ctxA.newPage();
  const b = await ctxB.newPage();
  return { ctxA, ctxB, a, b };
}

/** scrypt hash in the admin portal's format (see src/lib/server/admin-auth.ts). */
export function adminHash(password: string): string {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, 32, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

/** Creates an admin portal account and signs this page's context into it. */
export async function adminSignIn(
  page: Page,
  opts: { password?: string; mustChange?: boolean; userId?: string } = {},
) {
  const email = `ops-${randomUUID().slice(0, 8)}@clink.test`;
  const password = opts.password ?? "Ops-Password-2026";
  const { data, error } = await admin
    .from("admin_accounts")
    .insert({
      email,
      name: "Ops",
      password_hash: adminHash(password),
      must_change_password: opts.mustChange ?? false,
      user_id: opts.userId ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  // Each test signs in from its own documentation-range address, so a full run
  // stays under the per-IP sign-in limit (30 an hour) that real visitors get.
  const ip = `198.51.100.${1 + Math.floor(Math.random() * 254)}`;
  const r = await page.request.post("/api/admin/auth/login", {
    data: { email, password },
    headers: { "x-forwarded-for": ip },
  });
  if (!r.ok()) throw new Error(`admin login failed: ${r.status()}`);
  return { id: data.id, email, password };
}

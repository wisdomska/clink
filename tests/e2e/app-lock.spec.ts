import { createClient } from "@supabase/supabase-js";
import { test, expect } from "./fixtures";
import { admin } from "./helpers";

// CHAT-07: discreet mode for everyone, and an optional PIN asked for when Clink opens.
test("PIN on open locks the app until it is entered", async ({ couple }) => {
  const { a, b, nia } = couple;
  await a.goto("/settings");
  await expect(a.getByRole("switch", { name: /Discreet mode/ })).toBeVisible();
  await a.getByRole("button", { name: /Ask for a PIN on open/ }).click();
  await a.getByLabel("New PIN").fill("2468");
  await a.getByLabel("Same again").fill("2468");
  await a.getByRole("button", { name: "Turn on" }).click();
  await expect(a.getByText(/PIN on\./)).toBeVisible();

  // A new browser session (cookie gone) must unlock first, and sees nothing before.
  await a.context().clearCookies({ name: "clink_open" });
  await a.goto("/chat");
  await a.waitForURL(/\/unlock\?next=%2Fchat/);
  await expect(a.getByRole("heading", { name: "Enter your PIN" })).toBeVisible();
  for (const k of "1111") await a.getByRole("button", { name: k, exact: true }).click();
  await a.getByRole("button", { name: "Unlock" }).click();
  await expect(a.getByText(/tries left/)).toBeVisible();
  for (const k of "2468") await a.getByRole("button", { name: k, exact: true }).click();
  await a.getByRole("button", { name: "Unlock" }).click();
  await a.waitForURL("**/chat");

  // Their partner is not affected.
  await b.goto("/us");
  await expect(b).toHaveURL(/\/us$/);

  // The hash never reaches the client, even for its owner.
  const { data: link } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: nia.email,
  });
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
  await db.auth.verifyOtp({ token_hash: link.properties!.hashed_token, type: "magiclink" });
  expect((await db.from("user_private").select("app_pin_hash")).error).not.toBeNull();
  expect((await db.from("user_private").select("dob")).data).toHaveLength(1);
});

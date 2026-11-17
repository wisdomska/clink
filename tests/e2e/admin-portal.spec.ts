import { test, expect } from "./fixtures";
import { admin, adminHash } from "./helpers";

test("admin portal: own sign-in, forced password, change email and password, separate from Clink", async ({
  couple,
  browser,
}) => {
  const { a, nia } = couple;
  const email = `boss-${Date.now()}@clink.test`;
  await admin.from("admin_accounts").insert({
    email,
    name: "Boss",
    password_hash: adminHash("Temp-Admin-Pass-1"),
    must_change_password: true,
  });
  const ctx = await browser.newContext();
  const p = await ctx.newPage();

  // /admin asks for the admin login, not the Clink one.
  await p.goto("/admin");
  await expect(p).toHaveURL(/\/admin\/login/);
  await p.getByLabel("Admin email").fill(email);
  await p.getByLabel("Password", { exact: true }).fill("wrong-password-123");
  await p.getByRole("button", { name: "Sign in to admin" }).click();
  await expect(p.getByText("That email and password don't match.")).toBeVisible();
  await p.getByLabel("Password", { exact: true }).fill("Temp-Admin-Pass-1");
  await p.getByRole("button", { name: "Sign in to admin" }).click();

  // Temporary password: must choose one first; the API refuses until then.
  await expect(p).toHaveURL(/\/admin\/password/);
  expect((await p.request.get("/api/admin/metrics")).status()).toBe(403);
  // Type only once the form has hydrated, or the first keystrokes can be lost.
  await p.waitForFunction(() => document.documentElement.dataset.hydrated === "true");
  await p.getByLabel("New password").fill("Boss-Own-Pass-2026");
  await p.getByLabel("Type it again").fill("Boss-Own-Pass-2026");
  await p.getByLabel("Current password").fill("Temp-Admin-Pass-1");
  await p.getByRole("button", { name: "Save" }).click();
  await expect(p.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 15000 });

  // The admin session gives no Clink app access.
  await p.goto("/us");
  await expect(p).toHaveURL(/\/login/);

  // Change the admin email in Settings.
  const newEmail = `boss2-${Date.now()}@clink.test`;
  await p.goto("/admin/settings?tab=login");
  await expect(p.getByLabel("Admin email")).toHaveValue(email);
  await p.getByLabel("Admin email").fill(newEmail);
  await p.getByLabel("Current password").fill("Boss-Own-Pass-2026");
  await p.getByRole("button", { name: "Save", exact: true }).click();
  await expect(p.getByText("Admin account saved.")).toBeVisible();

  // Sign out, sign back in with the new email.
  await p.request.post("/api/admin/auth/logout");
  await ctx.clearCookies();
  await p.goto("/admin/login");
  await p.getByLabel("Admin email").fill(newEmail);
  await p.getByLabel("Password", { exact: true }).fill("Boss-Own-Pass-2026");
  await p.getByRole("button", { name: "Sign in to admin" }).click();
  await expect(p.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 15000 });

  // Detailed user page from Users.
  await p.goto(`/admin/users?q=${encodeURIComponent(nia.email)}`);
  await p.getByRole("link", { name: "Nia" }).click();
  await expect(p).toHaveURL(new RegExp(`/admin/users/${nia.id}`));
  await expect(p.getByText("Activity, last 30 days")).toBeVisible();
  await expect(p.getByText("Messages", { exact: true })).toBeVisible();
  await p.getByRole("tab", { name: "Profile" }).click();
  await expect(p.getByRole("region", { name: "Account" })).toBeVisible();
  await expect(p.getByRole("region", { name: "Couple" }).getByText(/Theo/)).toBeVisible();

  // A Clink session gives no admin access.
  expect((await a.request.get("/api/admin/metrics")).status()).toBe(401);
  await ctx.close();
});

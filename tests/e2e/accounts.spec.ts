import { test, expect } from "./fixtures";
import { admin } from "./helpers";

// ACC: password sign-in, a temporary password that must be replaced, and
// switching between accounts kept on one device.
test("password sign-in with a temporary password forces a new one first", async ({ couple }) => {
  const { a, ctxA, nia } = couple;
  const temp = "Temporary-Pass-1234";
  await admin.auth.admin.updateUserById(nia.id, {
    password: temp,
    app_metadata: { must_change_password: true },
  });
  // Fresh device: sign in with email + password.
  await ctxA.clearCookies();
  await a.goto("/login");
  await a.getByLabel("Email").fill(nia.email);
  await a.getByLabel(/Password/).fill(temp);
  await a.getByRole("button", { name: "Sign in" }).click();
  await expect(a).toHaveURL(/\/account\/password\?forced=1/);
  // Every other page sends you back until it's done.
  await a.goto("/chat");
  await expect(a).toHaveURL(/\/account\/password/);
  await expect(a.getByRole("heading", { name: /Choose your own password/ })).toBeVisible();

  await a.getByLabel("New password").fill("short");
  await a.getByLabel("Type it again").fill("short");
  await a.getByRole("button", { name: "Save password" }).click();
  await expect(a.getByText("Your password needs everything on the list.")).toBeVisible();

  const mine = "My-Own-Password-2026";
  await a.getByLabel("New password").fill(mine);
  await a.getByLabel("Type it again").fill(mine);
  await a.getByRole("button", { name: "Save password" }).click();
  await expect(a).toHaveURL(/\/(us|chat)/);
  const { data } = await admin.auth.admin.getUserById(nia.id);
  expect(data.user?.app_metadata.must_change_password).toBe(false);
  await a.goto("/settings?tab=account");
  await expect(a).toHaveURL(/\/settings/);

  // The new password works; the temporary one no longer does.
  await ctxA.clearCookies();
  await a.goto("/login");
  await a.getByLabel("Email").fill(nia.email);
  await a.getByLabel(/Password/).fill(temp);
  await a.getByRole("button", { name: "Sign in" }).click();
  await expect(a.getByText(/email and password don't match/)).toBeVisible();
  await a.getByLabel(/Password/).fill(mine);
  await a.getByRole("button", { name: "Sign in" }).click();
  await expect(a).toHaveURL(/\/us/);
});

test("switch between two accounts on one device without signing in again", async ({ couple }) => {
  const { a, nia, theo } = couple;
  await admin.auth.admin.updateUserById(theo.id, { password: "Theo-Password-2026" });
  await a.goto("/settings?tab=account");
  await a.getByRole("button", { name: /Switch account/ }).click();
  await expect(a.getByRole("dialog").getByText(nia.email)).toBeVisible();
  await a.getByRole("button", { name: "Add another account" }).click();
  await expect(a).toHaveURL(/\/login\?add=1/);

  await a.getByLabel("Email").fill(theo.email);
  await a.getByLabel(/Password/).fill("Theo-Password-2026");
  await a.getByRole("button", { name: "Sign in" }).click();
  await expect(a).toHaveURL(/\/us/);

  // Both accounts are listed; hop back to Nia with one tap.
  await a.goto("/settings?tab=account");
  await a.getByRole("button", { name: /Switch account/ }).click();
  const sheet = a.getByRole("dialog");
  await expect(sheet.getByText(theo.email)).toBeVisible();
  await sheet
    .getByRole("button", { name: new RegExp(`${nia.name} ${nia.email.split("@")[0]}`) })
    .click();
  await expect(a).toHaveURL(/\/us/);
  // Signed in as Nia again, so her partner is Theo.
  expect((await (await a.request.get("/api/me/state")).json()).partner).toBe(theo.name);

  // And back to Theo again: his saved sign-in still works after Nia's refreshed.
  await a.goto("/settings?tab=account");
  await a.getByRole("button", { name: /Switch account/ }).click();
  await a
    .getByRole("dialog")
    .getByRole("button", { name: new RegExp(`${theo.name} ${theo.email.split("@")[0]}`) })
    .click();
  await expect(a).toHaveURL(/\/us/);
  expect((await (await a.request.get("/api/me/state")).json()).partner).toBe(nia.name);
});

test("change email asks for confirmation", async ({ couple }) => {
  const { a } = couple;
  await a.goto("/settings?tab=account");
  await a.getByRole("button", { name: /^Email/ }).click();
  await a.getByLabel("New email").fill("not-an-email");
  await a.getByRole("button", { name: "Send confirmation" }).click();
  await expect(a.getByText("That email looks off.", { exact: false })).toBeVisible();
  await a.getByLabel("New email").fill(`new-${Date.now()}@clink.test`);
  await a.getByRole("button", { name: "Send confirmation" }).click();
  await expect(a.getByText(/Check both inboxes/)).toBeVisible();
});

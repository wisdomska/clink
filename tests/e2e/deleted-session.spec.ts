import { test, expect } from "./fixtures";
import { admin, makeUser, signIn } from "./helpers";

// A session that outlives its account must not loop between /us and /login.
test("a deleted account's old session lands on sign-in, not a redirect loop", async ({
  browser,
}) => {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  const u = await makeUser("Gone");
  await signIn(p, u, "/us");
  await expect(p).not.toHaveURL(/\/login/, { timeout: 15000 });

  await admin.auth.admin.deleteUser(u.id);

  await p.goto("/us");
  await expect(p).toHaveURL(/\/login/, { timeout: 15000 });
  await expect(p.getByRole("button", { name: /Continue|Sign in/ }).first()).toBeVisible();
  // Signed out for real: the sign-in page stays put.
  await p.reload();
  await expect(p).toHaveURL(/\/login/);
  await ctx.close();
});

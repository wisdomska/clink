import { test, expect } from "@playwright/test";
import { admin, adminSignIn } from "./helpers";

const MAIL = "http://127.0.0.1:54324/api/v1";

// The weekly health summary by email: on by default, sent on demand, and
// switchable off. Mail goes to the local catcher (Supabase's Mailpit).
test("admin: weekly health email can be sent now and turned off", async ({ page, request }) => {
  const { id, email } = await adminSignIn(page);
  await page.goto("/admin");
  const card = page.getByRole("region", { name: "This week's health" });
  const toggle = card.getByRole("switch", { name: "Email me this every Monday" });
  await expect(toggle).toBeChecked({ timeout: 20000 });
  await expect(card.getByText(`To ${email}`)).toBeVisible();

  await card.getByRole("button", { name: "Send one now" }).click();
  await expect(page.getByText("Sent. Check your inbox.")).toBeVisible({ timeout: 20000 });
  await expect
    .poll(
      async () => {
        const r = await request.get(`${MAIL}/search?query=${encodeURIComponent(`to:${email}`)}`);
        const d = (await r.json()) as { messages: Array<{ Subject: string }> };
        return d.messages[0]?.Subject ?? "";
      },
      { timeout: 15000 },
    )
    .toMatch(/^Clink this week: \d+ errors, \d+\/\d+ calls connected/);

  await toggle.click();
  await expect(toggle).not.toBeChecked();
  await expect
    .poll(
      async () =>
        (await admin.from("admin_accounts").select("weekly_email").eq("id", id).single()).data
          ?.weekly_email,
    )
    .toBe(false);
});

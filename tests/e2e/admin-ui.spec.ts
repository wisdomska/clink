import { test, expect } from "./fixtures";
import { admin, adminSignIn } from "./helpers";

test("admin: trends, live switches and in-app confirmations", async ({ couple, browser }) => {
  const { nia } = couple;
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await adminSignIn(p);
  await p.goto("/admin");

  await expect(p.getByRole("heading", { name: "Trends" })).toBeVisible({ timeout: 15000 });
  await expect(p.getByText("Sign-ups", { exact: true })).toBeVisible();
  await expect(p.getByText(/vs previous|No change/).first()).toBeVisible();
  await expect(p.getByRole("heading", { name: "Live switches" })).toBeVisible();

  // Search lives in the URL.
  await p.goto("/admin/users");
  await p.getByLabel("Search by email or name").fill(nia.email);
  await p.getByLabel("Search by email or name").press("Enter");
  await expect(p).toHaveURL(/\?q=/);
  await expect(p.getByRole("status").filter({ hasText: /^1 account$/ })).toBeVisible();
  const row = p.getByRole("row").filter({ hasText: nia.email });

  // Suspend needs a reason, in an in-app dialog.
  await row.getByRole("button", { name: "Suspend" }).click();
  const dlg = p.getByRole("dialog", { name: "Suspend this account?" });
  await expect(dlg).toBeVisible();
  await dlg.getByRole("button", { name: "Suspend", exact: true }).click();
  await expect(dlg.getByText("Add a short reason.")).toBeVisible();
  await dlg.getByLabel("Reason").fill("Test suspension");
  await dlg.getByRole("button", { name: "Suspend", exact: true }).click();
  await expect(p.getByText("Done. Logged in the audit trail.")).toBeVisible();
  await expect(p.getByText(/Suspended: Test suspension/)).toBeVisible();

  // Delete stays blocked until DELETE is typed; cancel leaves the account alone.
  await row.getByRole("button", { name: "Delete" }).click();
  const del = p.getByRole("dialog", { name: "Delete this account?" });
  await expect(del).toBeVisible();
  await del.getByLabel("Reason").fill("Not really");
  // Soft-disabled (aria-disabled) until DELETE is typed, but it still explains itself when pressed.
  await del.getByRole("button", { name: "Delete for good" }).dispatchEvent("click");
  await expect(del.getByText("Type DELETE exactly to confirm.")).toBeVisible();
  await del.getByRole("button", { name: "Cancel" }).click();
  const { data: prof } = await admin
    .from("profiles")
    .select("deleted_at")
    .eq("id", nia.id)
    .single();
  expect(prof!.deleted_at).toBeNull();
  await ctx.close();
});

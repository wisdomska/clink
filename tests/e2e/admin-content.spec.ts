import { randomUUID } from "node:crypto";
import { test, expect } from "./fixtures";
import { admin, adminSignIn } from "./helpers";

test("admin content access: reason required, every look logged, After Dark never shown", async ({
  couple,
  browser,
}) => {
  const { a, nia } = couple;
  await a.goto("/chat");
  await a.request.post("/api/messages", {
    data: { clientId: randomUUID(), type: "text", body: "hello from nia 4471" },
  });
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  const { email } = await adminSignIn(p);

  // No reason, no access.
  const bare = await p.request.post(`/api/admin/users/${nia.id}/conversation`, {
    data: { reason: "" },
  });
  expect(bare.status()).toBe(422);

  await p.goto(`/admin/users/${nia.id}`);
  await p.getByLabel("Why do you need to look?").fill("Checking report about harassment");
  await p.getByRole("button", { name: "Open conversation" }).click();
  await expect(p.getByText("hello from nia 4471")).toBeVisible();

  const { data: log } = await admin
    .from("audit_events")
    .select("event, meta, user_id")
    .eq("event", "admin.content_access")
    .eq("user_id", nia.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  expect(log?.meta).toMatchObject({ reason: "Checking report about harassment", admin: email });
  await ctx.close();
});

import { randomUUID } from "node:crypto";
import { test, expect } from "./fixtures";
import { admin, signIn } from "./helpers";

const outbox = (body: string) =>
  JSON.stringify({
    state: {
      items: [{ clientId: randomUUID(), type: "text", body, createdAt: new Date().toISOString() }],
      failed: {},
    },
    version: 0,
  });

// Two accounts on one device: what one account left behind (an unsent message,
// the look, cached pages) must never surface or be sent from the other.
test("switching accounts on one device never leaks or sends the other's content", async ({
  couple,
}) => {
  const { a, nia, theo } = couple;
  const niaBody = `only nia sends this ${Date.now()}`;
  const legacyBody = `unowned old queue ${Date.now()}`;

  await a.goto("/settings");
  // Nia leaves an unsent message behind; an old, unscoped queue is also lying around.
  await a.evaluate(
    ([key, val, legacy]: string[]) => {
      localStorage.setItem(key!, val!);
      localStorage.setItem("clink_outbox", legacy!);
    },
    [`clink_outbox:${nia.id}`, outbox(niaBody), outbox(legacyBody)],
  );

  // The same device switches to Theo.
  await a.context().clearCookies();
  await signIn(a, theo, "/chat");
  await expect(a.getByRole("textbox", { name: /^Message / })).toBeVisible({ timeout: 15000 });
  await a.waitForTimeout(3000);

  const sentBy = async (body: string) =>
    (await admin.from("messages").select("sender_id").eq("body", body)).data ?? [];
  expect(await sentBy(niaBody)).toEqual([]);
  expect(await sentBy(legacyBody)).toEqual([]);
  const keys = await a.evaluate(() => Object.keys(localStorage));
  expect(keys).not.toContain("clink_outbox");
  expect(keys).toContain(`clink_outbox:${nia.id}`);
  expect(await a.evaluate(() => localStorage.getItem("clink.lastUser"))).toBe(theo.id);

  // Back on Nia's account, her own message goes out, from her.
  await a.context().clearCookies();
  await signIn(a, nia, "/chat");
  await expect
    .poll(async () => (await sentBy(niaBody)).map((r) => r.sender_id), { timeout: 20000 })
    .toEqual([nia.id]);
});

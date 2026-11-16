import { test, expect } from "./fixtures";
import { admin } from "./helpers";

// Taps answer at once: optimistic mood, undo instead of confirm, quick actions on long-press.

test("mood shows the moment you pick it", async ({ couple }) => {
  const { a } = couple;
  await a.goto("/us");
  await a.getByRole("radio", { name: "Cosy" }).click();
  // Optimistic: no network wait before the picker closes.
  await expect(a.getByText("You're feeling cosy")).toBeVisible({ timeout: 500 });
});

test("removing a countdown offers Undo, and Undo keeps it", async ({ couple }) => {
  const { a, nia } = couple;
  const coupleId = (
    await admin.from("couple_members").select("couple_id").eq("user_id", nia.id).single()
  ).data!.couple_id;
  await admin.from("countdowns").insert({
    couple_id: coupleId,
    created_by: nia.id,
    title: "Lisbon",
    target_at: new Date(Date.now() + 9 * 86_400_000).toISOString(),
  });
  await a.goto("/us/countdowns");
  await a.getByRole("button", { name: "Remove Lisbon" }).click();
  await expect(a.getByRole("heading", { name: "Lisbon" })).toBeHidden({ timeout: 500 });
  await a.getByRole("button", { name: "Undo" }).click();
  await expect(a.getByRole("heading", { name: "Lisbon" })).toBeVisible();
  await a.waitForTimeout(5500);
  const { data } = await admin.from("countdowns").select("id").eq("couple_id", coupleId);
  expect(data?.length).toBe(1);

  // Without Undo, it goes once the toast has gone.
  await a.getByRole("button", { name: "Remove Lisbon" }).click();
  await expect
    .poll(
      async () =>
        (await admin.from("countdowns").select("id").eq("couple_id", coupleId)).data?.length,
      { timeout: 10000 },
    )
    .toBe(0);
});

test("right-click (or long-press) your partner for quick actions", async ({ couple }) => {
  const { a } = couple;
  await a.goto("/us");
  await a.getByRole("button", { name: /Open Theo's profile/ }).click({ button: "right" });
  const menu = a.getByRole("menu", { name: "Quick actions for Theo" });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("menuitem")).toHaveCount(5);
  await menu.getByRole("menuitem", { name: "Message" }).click();
  await expect(a).toHaveURL(/\/chat/);
});

test("tab bar lights the tapped tab straight away", async ({ couple }) => {
  const { a } = couple;
  await a.goto("/us");
  const nav = a.getByRole("navigation", { name: "Main" }).filter({ visible: true }).first();
  await nav.getByRole("link", { name: "Plans" }).click();
  await expect(nav.getByRole("link", { name: "Plans" })).toHaveAttribute("aria-current", "page", {
    timeout: 300,
  });
});

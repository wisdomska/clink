import { test, expect } from "./fixtures";
import { admin, adminSignIn, makeUser } from "./helpers";

type Funnel = {
  steps: Array<{ key: string; count: number }>;
  waiting_on_partner: number;
  not_invited: number;
};
// Invite codes: 6 characters, no 0/O/1/I.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const inviteCode = () =>
  Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");
const count = (f: Funnel, key: string) => f.steps.find((s) => s.key === key)!.count;

test("admin: new people, step by step, from signing up to notifications", async ({ page }) => {
  await adminSignIn(page);
  const get = async () =>
    (await (await page.request.get("/api/admin/funnel?days=7")).json()) as Funnel;
  const before = await get();

  // Someone who set up and invited a partner who hasn't joined, and someone
  // who signed up but stopped before their profile.
  const ama = await makeUser("Ama");
  await admin.from("invites").insert({ code: inviteCode(), inviter_id: ama.id });
  await makeUser("Kofi", { onboarded: false });

  const after = await get();
  expect(count(after, "signed_up")).toBe(count(before, "signed_up") + 2);
  expect(count(after, "set_up")).toBe(count(before, "set_up") + 1);
  expect(count(after, "linked")).toBe(count(before, "linked"));
  expect(after.waiting_on_partner).toBe(before.waiting_on_partner + 1);
  // Each step can only hold people from the step before.
  for (let i = 1; i < after.steps.length - 1; i++)
    expect(after.steps[i]!.count).toBeLessThanOrEqual(after.steps[i - 1]!.count);

  await page.goto("/admin");
  const section = page.getByRole("region", { name: "New people, step by step" });
  await expect(section).toBeVisible({ timeout: 20000 });
  await section.getByRole("button", { name: "7 days" }).click();
  await expect(section.getByRole("button", { name: "7 days" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const steps = section.getByRole("list", { name: "Steps" });
  await expect(steps.getByText("Signed up")).toBeVisible();
  await expect(steps.getByText("Turned on notifications")).toBeVisible();
  await expect(section.getByText("Invited a partner who hasn't joined yet")).toBeVisible();

  // Counts only: no names or emails anywhere in the answer.
  const raw = await (await page.request.get("/api/admin/funnel?days=7")).text();
  expect(raw).not.toContain(ama.email);
  expect(raw).not.toContain("Ama");
});

test("the funnel is for admins only", async ({ request }) => {
  const r = await request.get("/api/admin/funnel");
  expect([401, 403]).toContain(r.status());
});

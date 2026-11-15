import { test, expect } from "./fixtures";

// HOME-05: honest moods, including the hard ones, and you can change yours any time.
test("mood check-in reaches the partner and can be changed later", async ({ couple }) => {
  const { a, b } = couple;
  await b.goto("/us");
  await a.goto("/us");
  await expect(a.getByRole("radiogroup", { name: /Your mood/ })).toHaveCount(3);
  await expect(a.getByRole("radio")).toHaveCount(17);
  await a.getByLabel("Add a line (optional)").fill("train delayed again");
  await a.getByRole("radio", { name: "Missing you" }).click();
  await expect(a.getByText(/You're/)).toBeVisible();
  await expect(b.getByText(/Nia is missing you/)).toBeVisible({ timeout: 10000 });
  await expect(b.getByText("“train delayed again”")).toBeVisible();

  // Things happen: change it.
  await a.getByRole("button", { name: "Change your mood" }).click();
  await a.getByRole("radio", { name: "Angry" }).click();
  await expect(b.getByText(/Nia is angry/)).toBeVisible({ timeout: 10000 });
  await expect(b.getByRole("link", { name: "Talk it out" })).toBeVisible();
});

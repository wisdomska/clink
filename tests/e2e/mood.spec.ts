import { test, expect } from "./fixtures";

// HOME-05: one tap from six moods plus an optional line; the partner sees it on Us.
test("mood check-in reaches the partner, once a day", async ({ couple }) => {
  const { a, b } = couple;
  await b.goto("/us");
  await a.goto("/us");
  const moods = a.getByRole("radiogroup", { name: "Your mood" });
  await expect(moods.getByRole("radio")).toHaveCount(6);
  await a.getByLabel("Add a line (optional)").fill("train delayed again");
  await moods.getByRole("radio", { name: "Missing you" }).click();
  await expect(a.getByText(/Sent\. Theo sees it on Us\./)).toBeVisible();

  await expect(b.getByText('Nia is missing you. "train delayed again"')).toBeVisible({
    timeout: 10000,
  });

  // Today's answer is locked in.
  await a.reload();
  await expect(moods.getByRole("radio", { name: "Missing you" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(moods.getByRole("radio", { name: "Cosy" })).toBeDisabled();
});

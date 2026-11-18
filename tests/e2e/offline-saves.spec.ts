import { test, expect } from "./fixtures";
import { admin } from "./helpers";
import { pickDate } from "./controls";

test("a save made offline waits, then goes through when the connection is back", async ({
  couple,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "offline emulation");
  const { a, nia } = couple;
  const coupleId = (
    await admin.from("couple_members").select("couple_id").eq("user_id", nia.id).single()
  ).data!.couple_id as string;
  await a.goto("/us/countdowns?new=1");
  const sheet = a.getByRole("dialog", { name: "New countdown" });
  await sheet.getByRole("radio", { name: "Date night" }).click();
  await pickDate(sheet, "Date", new Date(Date.now() + 4 * 86_400_000).toISOString().slice(0, 10));

  await a.context().setOffline(true);
  await expect(a.getByText(/You're offline\. Messages and saves/)).toBeVisible();
  await sheet.getByRole("button", { name: "Put it on the board" }).click();
  await expect(a.getByText("You're offline. This will save when you're back.")).toBeVisible();
  await a.waitForTimeout(1500);
  const none = await admin
    .from("countdowns")
    .select("id")
    .eq("couple_id", coupleId)
    .eq("title", "Date night");
  expect(none.data).toHaveLength(0);

  await a.context().setOffline(false);
  await expect
    .poll(
      async () =>
        (
          await admin
            .from("countdowns")
            .select("id")
            .eq("couple_id", coupleId)
            .eq("title", "Date night")
        ).data?.length,
      { timeout: 15000 },
    )
    .toBe(1);
  await expect(a.getByRole("heading", { name: "Date night" })).toBeVisible();
});

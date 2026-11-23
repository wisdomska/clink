import { test, expect } from "./fixtures";
import { admin, waitLive } from "./helpers";

// Open a time capsule together: one asks, the other joins from wherever they
// are, and a shared countdown uncorks it on both devices at once.
test("open a time capsule together, from anywhere in the app", async ({ couple }) => {
  test.setTimeout(90_000);
  const { a, b, nia } = couple;
  const coupleId = (
    await admin.from("couple_members").select("couple_id").eq("user_id", nia.id).single()
  ).data!.couple_id as string;
  const { data: cap, error } = await admin
    .from("capsules")
    .insert({
      couple_id: coupleId,
      author_id: nia.id,
      title: "Our first year",
      created_at: new Date(Date.now() - 400 * 86400_000).toISOString(),
      unlock_at: new Date(Date.now() - 60_000).toISOString(),
    })
    .select("id")
    .single();
  expect(error).toBeNull();
  await admin
    .from("capsule_contents")
    .insert({ capsule_id: cap!.id, couple_id: coupleId, body: "Remember Labadi at sunset?" });

  await b.goto("/us");
  await a.goto(`/keep/capsules/${cap!.id}`);
  await Promise.all([waitLive(a), waitLive(b)]);
  await a.getByRole("button", { name: "Open together with Theo" }).click();
  await expect(a.getByText(/Waiting for Theo to join/)).toBeVisible();

  // Theo is on Us: a prompt with Join.
  await expect(b.getByText("Nia wants to open “Our first year” with you now.")).toBeVisible({
    timeout: 15000,
  });
  await b.getByRole("button", { name: "Join" }).click();
  await b.waitForURL(/\/keep\/capsules\//);

  // The same countdown on both, then both see inside.
  await expect(a.getByText("Opening together in")).toBeVisible({ timeout: 10000 });
  await expect(a.getByText("Remember Labadi at sunset?")).toBeVisible({ timeout: 15000 });
  await expect(b.getByText("Remember Labadi at sunset?")).toBeVisible({ timeout: 15000 });
});

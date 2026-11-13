import { test, expect } from "./fixtures";
import { admin } from "./helpers";

// KEEP-02: a time capsule can hold a voice note, sealed until its date.
test("seal a voice note in a capsule and open it on the day", async ({ couple }) => {
  const { a, b } = couple;
  await a.goto("/keep");
  await a.getByRole("button", { name: "Seal one" }).click();
  await a.getByLabel("Name it").fill("Our song, hummed");
  const d = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  await a.getByLabel("Opens on").fill(d);
  await a.getByRole("button", { name: "Record a voice note" }).click();
  await a.waitForTimeout(1500);
  await a.getByRole("button", { name: "Stop recording" }).click();
  await expect(a.getByRole("button", { name: /Remove attachment/ })).toContainText("Voice note");
  await a.getByRole("button", { name: "Cork it" }).click();
  await expect(a.getByText("Corked. See you then.")).toBeVisible();

  const { data: cap } = await admin
    .from("capsules")
    .select("id, capsule_contents(media_id, media(kind))")
    .eq("title", "Our song, hummed")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  const content = cap!.capsule_contents as unknown as { media: { kind: string } | null };
  expect(content.media?.kind).toBe("audio");

  // Sealed: nothing to play yet.
  await b.goto(`/keep/capsules/${cap!.id}`);
  await expect(b.locator("audio")).toHaveCount(0);

  await admin
    .from("capsules")
    .update({
      unlock_at: new Date(Date.now() - 1000).toISOString(),
      created_at: new Date(Date.now() - 2000).toISOString(),
    })
    .eq("id", cap!.id);
  await b.reload();
  await b.getByRole("button", { name: "Uncork it" }).click();
  await expect(b.locator("audio")).toHaveCount(1);
});

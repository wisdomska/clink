import { test, expect } from "./fixtures";
import { admin } from "./helpers";

const DAY = 86_400_000;

async function coupleOf(userId: string) {
  return (await admin.from("couple_members").select("couple_id").eq("user_id", userId).single())
    .data!.couple_id as string;
}

test("a countdown can be edited until it reaches zero; the sealed note stays its writer's", async ({
  couple,
}) => {
  const { a, b, nia } = couple;
  const coupleId = await coupleOf(nia.id);
  const { data: rows } = await admin
    .from("countdowns")
    .insert([
      {
        couple_id: coupleId,
        created_by: nia.id,
        title: "Kumasi trip",
        target_at: new Date(Date.now() + 9 * DAY).toISOString(),
        reveal_note: "Pack the kente.",
      },
      {
        couple_id: coupleId,
        created_by: nia.id,
        title: "Last visit",
        target_at: new Date(Date.now() - DAY).toISOString(),
      },
    ])
    .select("id, title");
  const trip = rows!.find((r) => r.title === "Kumasi trip")!;

  // Nia moves the trip and renames it; it shows straight away.
  await a.goto("/us/countdowns");
  await expect(a.getByRole("button", { name: "Edit Last visit" })).toHaveCount(0);
  await a.getByRole("button", { name: "Edit Kumasi trip" }).click();
  const sheet = a.getByRole("dialog", { name: "Edit countdown" });
  await expect(sheet.getByLabel("Name")).toHaveValue("Kumasi trip");
  await sheet.getByLabel("Name").fill("Kumasi weekend");
  await expect(sheet.getByLabel("Replace the sealed note (optional)")).toHaveValue("");
  await sheet.getByRole("button", { name: "Save changes" }).click();
  await expect(a.getByRole("heading", { name: "Kumasi weekend" })).toBeVisible({ timeout: 1000 });
  await expect
    .poll(
      async () =>
        (await admin.from("countdowns").select("title, reveal_note").eq("id", trip.id).single())
          .data,
    )
    .toEqual({ title: "Kumasi weekend", reveal_note: "Pack the kente." });

  // Theo sees the change, can edit the details, but not Nia's sealed note.
  await b.goto("/us/countdowns");
  await expect(b.getByRole("heading", { name: "Kumasi weekend" })).toBeVisible();
  await b.getByRole("button", { name: "Edit Kumasi weekend" }).click();
  const theirs = b.getByRole("dialog", { name: "Edit countdown" });
  await expect(
    theirs.getByText("Nia's sealed note stays as it is.", { exact: false }),
  ).toBeVisible();
  await expect(theirs.getByLabel(/sealed note/)).toHaveCount(0);
});

import sharp from "sharp";
import { test, expect } from "./fixtures";
import { admin } from "./helpers";

// Memoji avatars: pick a person and a pose, it shows everywhere; upload any photo, it replaces it;
// pick a memoji again and the photo is dropped.
test("pick a memoji avatar, upload your own photo, and switch back", async ({ couple }) => {
  const { a, nia } = couple;
  await a.goto("/onboarding?edit=1");
  const people = a.getByRole("radiogroup", { name: "Person", exact: true });
  const poses = a.getByRole("radiogroup", { name: "Pose", exact: true });
  await expect(people.getByRole("radio")).toHaveCount(10);
  await expect(poses.getByRole("radio")).toHaveCount(12);
  await people.getByRole("radio", { name: "Man with dark skin and spiky hair" }).click();
  await expect(
    people.getByRole("radio", { name: "Man with dark skin and spiky hair" }),
  ).toHaveAttribute("aria-checked", "true");
  await poses.getByRole("radio", { name: "Party", exact: true }).click();
  await expect(poses.getByRole("radio", { name: "Party", exact: true })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await a
    .getByRole("button", { name: "Next" })
    .or(a.getByRole("button", { name: "Continue" }))
    .first()
    .click();
  await expect
    .poll(
      async () =>
        (await admin.from("profiles").select("avatar_icon").eq("id", nia.id).single()).data
          ?.avatar_icon,
    )
    .toBe("m-p13-party");

  // Any photo, no content filter: it is only resized and stripped of metadata.
  await a.goto("/onboarding?edit=1");
  const png = await sharp({
    create: { width: 900, height: 600, channels: 3, background: { r: 230, g: 138, b: 245 } },
  })
    .jpeg()
    .toBuffer();
  await a
    .locator('input[type="file"]')
    .setInputFiles({ name: "me.jpg", mimeType: "image/jpeg", buffer: png });
  await expect(a.getByRole("img", { name: "Your photo" })).toBeVisible({ timeout: 15000 });
  await expect
    .poll(
      async () =>
        (await admin.from("profiles").select("avatar_kind").eq("id", nia.id).single()).data
          ?.avatar_kind,
    )
    .toBe("photo");

  await a
    .getByRole("radiogroup", { name: "Pose", exact: true })
    .getByRole("radio", { name: "Laughing", exact: true })
    .click();
  await a
    .getByRole("button", { name: "Next" })
    .or(a.getByRole("button", { name: "Continue" }))
    .first()
    .click();
  await expect
    .poll(
      async () =>
        (await admin.from("profiles").select("avatar_kind, avatar_icon").eq("id", nia.id).single())
          .data,
    )
    .toEqual({ avatar_kind: "icon", avatar_icon: "m-p13-laugh" });
  await a.goto("/settings");
  await expect(a.locator('img[src="/memoji/p13-laugh.webp"]:visible').first()).toBeVisible();
});

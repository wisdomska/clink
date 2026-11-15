import sharp from "sharp";
import { test, expect } from "./fixtures";
import { admin } from "./helpers";

// 3D avatars: pick one, it shows everywhere; upload any photo, it replaces it;
// pick a 3D face again and the photo is dropped.
test("pick a 3D avatar, upload your own photo, and switch back", async ({ couple }) => {
  const { a, nia } = couple;
  await a.goto("/onboarding?edit=1");
  const grid = a.getByRole("radiogroup", { name: "Avatar" });
  await expect(grid.getByRole("radio")).toHaveCount(28);
  await grid.getByRole("radio", { name: "Fox" }).click();
  await expect(grid.getByRole("radio", { name: "Fox" })).toHaveAttribute("aria-checked", "true");
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
    .toBe("fox");

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

  await a.getByRole("radio", { name: "Panda" }).click();
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
    .toEqual({ avatar_kind: "icon", avatar_icon: "panda" });
  await a.goto("/settings");
  await expect(a.locator('img[src="/avatars/panda.webp"]').first()).toBeVisible();
});

import sharp from "sharp";
import { test, expect } from "./fixtures";
import { admin } from "./helpers";

// Memoji avatars: pick a person and a pose, it shows everywhere; upload any photo, it replaces it;
// pick a memoji again and the photo is dropped.
test("pick a memoji avatar, upload your own photo, and switch back", async ({ couple }) => {
  const { a, nia } = couple;
  await a.goto("/onboarding?edit=1");
  const iam = a.getByRole("radiogroup", { name: "I'm a" });
  const people = a.getByRole("radiogroup", { name: "Person", exact: true });
  const poses = a.getByRole("radiogroup", { name: "Pose", exact: true });
  // Only your cast is offered: the 8 women, the 8 men, or all 16.
  await iam.getByRole("radio", { name: "Woman", exact: true }).click();
  await expect(people.getByRole("radio")).toHaveCount(8);
  await iam.getByRole("radio", { name: "Man", exact: true }).click();
  await expect(people.getByRole("radio")).toHaveCount(8);
  await iam.getByRole("radio", { name: "Not saying" }).click();
  await expect(people.getByRole("radio")).toHaveCount(16);
  await people.getByRole("radio", { name: "Man with dark skin, spiky hair and glasses" }).click();
  await expect(
    people.getByRole("radio", { name: "Man with dark skin, spiky hair and glasses" }),
  ).toHaveAttribute("aria-checked", "true");
  await expect(poses.getByRole("radio")).toHaveCount(16);
  // A new person needs a pose: Continue won't go on without one.
  await a.getByRole("button", { name: "Continue" }).click();
  await expect(a.getByText("Pick a pose to finish your avatar.")).toBeVisible();
  await poses.getByRole("radio", { name: "Star-struck", exact: true }).click();
  await expect(poses.getByRole("radio", { name: "Star-struck", exact: true })).toHaveAttribute(
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
    .toBe("m-m2-starstruck");
  expect(
    (await admin.from("profiles").select("gender").eq("id", nia.id).single()).data?.gender,
  ).toBe("unspecified");

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

  // Poses stay folded until you tap your person.
  await expect(a.getByRole("radiogroup", { name: "Pose", exact: true })).toHaveCount(0);
  await a
    .getByRole("radiogroup", { name: "Person", exact: true })
    .getByRole("radio", { name: "Man with dark skin, spiky hair and glasses" })
    .click();
  await a
    .getByRole("radiogroup", { name: "Pose", exact: true })
    .getByRole("radio", { name: "Tongue out", exact: true })
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
    .toEqual({ avatar_kind: "icon", avatar_icon: "m-m2-tongue" });
  await a.goto("/settings");
  await expect(a.locator('img[src="/memoji/m2-tongue.webp"]:visible').first()).toBeVisible();
});

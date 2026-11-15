import { test, expect } from "./fixtures";
import { admin } from "./helpers";

test("edit your profile (avatar, about, love language, birthday) and see your partner's from anywhere", async ({
  couple,
}) => {
  const { a, b, nia } = couple;
  await b.goto("/us");
  await a.goto("/settings");
  await a.getByRole("button", { name: "Edit profile" }).click();
  const sheet = a.getByRole("dialog", { name: "Edit profile" });
  await sheet.getByRole("radio", { name: "Woman dancing, medium skin" }).click();
  await sheet.getByLabel("About you").fill("Coffee snob, terrible singer.");
  await sheet.getByRole("radio", { name: "Quality time" }).click();
  await sheet.getByRole("switch", { name: /Show my birthday/ }).click();
  await sheet.getByRole("button", { name: "Save" }).click();
  await expect(a.getByText("Profile saved.")).toBeVisible();
  await expect
    .poll(
      async () =>
        (
          await admin
            .from("profiles")
            .select("avatar_icon, bio, love_language, share_birthday")
            .eq("id", nia.id)
            .single()
        ).data,
    )
    .toEqual({
      avatar_icon: "p-w-dance-m",
      bio: "Coffee snob, terrible singer.",
      love_language: "time",
      share_birthday: true,
    });

  // Theo taps Nia anywhere: Us, Chat, Play.
  await b.reload();
  await b
    .getByRole("button", { name: /Open Nia's profile/ })
    .first()
    .click();
  const profile = b.getByRole("dialog", { name: "Nia's profile" });
  await expect(profile.getByText("Coffee snob, terrible singer.")).toBeVisible();
  await expect(profile.getByText("Quality time")).toBeVisible();
  await expect(profile.getByText("14 March")).toBeVisible();
  await expect(profile.getByText(/km|Same place/)).toBeVisible();
  await expect(profile.getByText(/days$/)).toBeVisible();
  await b.keyboard.press("Escape");
  await b.goto("/chat");
  await b.getByRole("button", { name: /Open Nia's profile/ }).click();
  await expect(b.getByRole("dialog", { name: "Nia's profile" })).toBeVisible();
  await b.keyboard.press("Escape");
  await b.goto("/play");
  await b.getByRole("button", { name: "Nia", exact: true }).click();
  await expect(b.getByRole("dialog", { name: "Nia's profile" })).toBeVisible();
});

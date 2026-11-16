import sharp from "sharp";
import { test, expect } from "./fixtures";
import { admin } from "./helpers";

test("reactions toggle off, any emoji, custom blurred wallpaper, appearance", async ({
  couple,
}) => {
  const { a, b, nia } = couple;
  await b.goto("/chat");
  await a.goto("/chat");
  await a.getByRole("textbox", { name: "Message Theo" }).fill("react to me");
  await a.keyboard.press("Enter");

  // Theo searches the emoji picker and reacts, then sees it highlighted.
  await b.getByRole("button", { name: /Nia: react to me/ }).click({ button: "right" });
  await b.getByRole("button", { name: "React with any emoji" }).click();
  await b.getByRole("textbox", { name: "Search emoji" }).fill("unicorn");
  await b.getByRole("button", { name: "🦄" }).click();
  await expect(a.getByRole("group", { name: /Reactions: 🦄/ })).toBeVisible({ timeout: 10000 });
  await b.getByRole("button", { name: /Nia: react to me/ }).click({ button: "right" });
  await expect(b.getByRole("button", { name: "Remove your 🦄 reaction" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await b.keyboard.press("Escape");

  // Tapping your own reaction removes it.
  await b.getByRole("button", { name: /Your reaction 🦄/ }).click();
  await expect(a.getByRole("group", { name: /Reactions/ })).toHaveCount(0, { timeout: 10000 });

  // New looks: grouped pickers, a duotone theme and a drawn wallpaper, shown live in the preview.
  await a.getByRole("button", { name: "More" }).click();
  await a.getByRole("button", { name: "Customise chat" }).click();
  const themes = a.getByRole("radiogroup", { name: "Chat theme" });
  await expect(themes.getByRole("group", { name: "Duotone" })).toBeVisible();
  await expect(themes.getByRole("radio")).toHaveCount(25);
  await themes.getByRole("radio", { name: "Rouge and lilac" }).click();
  await expect(themes.getByRole("radio", { name: "Rouge and lilac" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  const walls = a.getByRole("radiogroup", { name: "Chat wallpaper" });
  await expect(walls.getByRole("radio")).toHaveCount(22);
  await walls.getByRole("radio", { name: "Two cities" }).click();
  await expect
    .poll(() =>
      a
        .getByTestId("look-preview")
        .evaluate((el) => getComputedStyle(el).getPropertyValue("--bubble-in")),
    )
    .toContain("#2B2342");
  const cidLook = (
    await admin.from("couple_members").select("couple_id").eq("user_id", nia.id).single()
  ).data!.couple_id;
  await expect
    .poll(
      async () =>
        (
          await admin
            .from("couples")
            .select("chat_theme, chat_wallpaper")
            .eq("id", cidLook)
            .single()
        ).data,
    )
    .toEqual({ chat_theme: "duo_rouge", chat_wallpaper: "two_cities" });
  await expect
    .poll(() =>
      b.getByTestId("chat-wallpaper").evaluate((el) => getComputedStyle(el).backgroundImage),
    )
    .toContain("data:image/svg+xml");

  // Custom wallpaper from a photo, blurred.
  const img = await sharp({
    create: { width: 600, height: 900, channels: 3, background: "#6CB8FF" },
  })
    .jpeg()
    .toBuffer();
  await a
    .getByTestId("wallpaper-input")
    .setInputFiles({ name: "w.jpg", mimeType: "image/jpeg", buffer: img });
  await expect(a.getByText("Wallpaper set.")).toBeVisible({ timeout: 15000 });
  await a.getByRole("switch", { name: /Blur the wallpaper/ }).click();
  const cid = (
    await admin.from("couple_members").select("couple_id").eq("user_id", nia.id).single()
  ).data!.couple_id;
  await expect
    .poll(
      async () =>
        (
          await admin
            .from("couples")
            .select("chat_wallpaper, chat_wallpaper_blur")
            .eq("id", cid)
            .single()
        ).data,
    )
    .toEqual({ chat_wallpaper: "custom", chat_wallpaper_blur: true });
  await expect
    .poll(() =>
      b.getByTestId("chat-wallpaper").evaluate((el) => getComputedStyle(el).backgroundImage),
    )
    .toContain("/api/media/");

  // Appearance: accent colour applies app-wide.
  await a.goto("/settings?tab=look");
  await a
    .getByRole("radiogroup", { name: "Accent colour" })
    .getByRole("radio", { name: "Mint" })
    .click();
  await expect
    .poll(() =>
      a.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue("--accent").trim(),
      ),
    )
    .toBe("#5ED3B3");
  await a
    .getByRole("radiogroup", { name: "Bubble shape" })
    .getByRole("radio", { name: "Square" })
    .click();
  await a.reload();
  await expect
    .poll(() =>
      a.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue("--bubble-r").trim(),
      ),
    )
    .toBe("8px");
});

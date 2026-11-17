import { test, expect } from "./fixtures";
import { admin } from "./helpers";

test("chat theme and wallpaper are shared; double-tap hearts a message", async ({ couple }) => {
  const { a, b, nia } = couple;
  await b.goto("/chat");
  await a.goto("/chat");
  await a.getByRole("textbox", { name: "Message Theo" }).fill("hello you");
  await a.getByRole("button", { name: "Send", exact: true }).click();

  await a.getByRole("button", { name: "More" }).click();
  await a.getByRole("button", { name: "Customise chat" }).click();
  await a
    .getByRole("radiogroup", { name: "Chat theme" })
    .getByRole("radio", { name: /Sunset/ })
    .click();
  await a
    .getByRole("radiogroup", { name: "Chat wallpaper" })
    .getByRole("radio", { name: /Hearts/ })
    .click();
  await expect(a.getByRole("radio", { name: /Sunset/ })).toHaveAttribute("aria-checked", "true");
  await a.keyboard.press("Escape");

  // Theo's chat changes live, and it's saved for the couple.
  await expect
    .poll(() =>
      b.evaluate(() => {
        const el = document.querySelector(
          '[aria-live="polite"].overflow-y-auto',
        ) as HTMLElement | null;
        return el ? getComputedStyle(el).getPropertyValue("--bubble-out") : "";
      }),
    )
    .toContain("#ff7a59");
  const cid = (
    await admin.from("couple_members").select("couple_id").eq("user_id", nia.id).single()
  ).data!.couple_id;
  await expect
    .poll(
      async () =>
        (await admin.from("couples").select("chat_theme, chat_wallpaper").eq("id", cid).single())
          .data,
    )
    .toEqual({ chat_theme: "sunset", chat_wallpaper: "hearts" });

  // Instagram-style double tap.
  await b.getByRole("button", { name: /Nia: hello you/ }).dblclick();
  await expect(a.getByRole("group", { name: /Reactions: ❤️/ })).toBeVisible({ timeout: 10000 });
});

import { test, expect } from "./fixtures";
import { admin } from "./helpers";

// The rail's account row opens your profile, which is the first Settings tab.
test("account row in the rail opens the Profile tab", async ({ couple }) => {
  const { a, nia } = couple;
  await a.setViewportSize({ width: 1280, height: 800 });
  await a.goto("/us");
  const account = a.getByRole("link", { name: new RegExp(`${nia.name}.*Profile and settings`) });
  await expect(account).toBeVisible();
  await account.click();
  await expect(a).toHaveURL(/\/settings\?tab=profile/);
  await expect(account).toHaveAttribute("aria-current", "page");
  await expect(a.getByRole("tab", { name: "Profile" })).toHaveAttribute("aria-selected", "true");
  await expect(a.getByLabel("Your name")).toHaveValue(nia.name);

  // Keyboard: it takes focus and Enter opens it.
  await a.goto("/us");
  await account.focus();
  await a.keyboard.press("Enter");
  await expect(a).toHaveURL(/\/settings\?tab=profile/);
});

test("older Settings tab links still land on their tab", async ({ couple }) => {
  const { a } = couple;
  for (const [tab, name] of [
    ["look", "Look and feel"],
    ["alerts", "Notifications"],
    ["privacy", "Privacy"],
    ["account", "Account"],
  ] as const) {
    await a.goto(`/settings?tab=${tab}`);
    await expect(a.getByRole("tab", { name })).toHaveAttribute("aria-selected", "true");
  }
  await a.goto("/settings");
  await expect(a.getByRole("tab", { name: "Profile" })).toHaveAttribute("aria-selected", "true");
});

test("profile edits save in place, and can be discarded", async ({ couple }) => {
  const { a, nia } = couple;
  await a.goto("/settings");
  const panel = a.getByRole("tabpanel");
  const save = panel.getByRole("button", { name: "Save", exact: true });
  await expect(save).toBeDisabled();
  await expect(panel.getByText("All changes saved")).toBeVisible();

  // Discard puts the form back.
  await panel.getByLabel("Your name").fill("Someone else");
  await expect(panel.getByText("Unsaved changes")).toBeVisible();
  await panel.getByRole("button", { name: "Discard" }).click();
  await expect(panel.getByLabel("Your name")).toHaveValue(nia.name);

  // An empty name is caught before it is sent.
  await panel.getByLabel("Your name").fill("");
  await save.click();
  await expect(panel.getByText("Give us something to call you.")).toBeVisible();

  await panel.getByLabel("Your name").fill("Nia R");
  await panel.getByLabel(/What you call/).fill("Sunshine");
  await save.click();
  await expect(panel.getByText("All changes saved")).toBeVisible();
  await expect(a.getByText("Profile saved.")).toBeVisible();
  await expect
    .poll(
      async () =>
        (
          await admin
            .from("profiles")
            .select("display_name, partner_nickname")
            .eq("id", nia.id)
            .single()
        ).data,
    )
    .toEqual({ display_name: "Nia R", partner_nickname: "Sunshine" });
});

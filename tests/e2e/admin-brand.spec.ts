import { test, expect } from "@playwright/test";
import { adminSignIn } from "./helpers";

test("admin: the live brand sheet shows tokens, type and controls", async ({ page: p }) => {
  await adminSignIn(p);
  await p.goto("/admin/brand");
  await expect(p.getByRole("heading", { name: "Brand", exact: true })).toBeVisible({
    timeout: 15000,
  });
  for (const s of [
    "Logo",
    "Brand colours",
    "Surfaces and status",
    "Type",
    "Shape",
    "Icons",
    "Controls",
  ])
    await expect(p.getByRole("region", { name: s, exact: true })).toBeVisible();
  await expect(p.getByText("--rouge · #FF4F7B")).toBeVisible();
  // The controls are the real ones.
  const sw = p.getByRole("switch", { name: /A toggle/ });
  await expect(sw).toHaveAttribute("aria-checked", "true");
  await sw.click();
  await expect(sw).toHaveAttribute("aria-checked", "false");
});

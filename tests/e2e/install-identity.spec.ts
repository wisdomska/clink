import { test, expect } from "./fixtures";

// SET-02: pick a discreet name and icon on the install guide; the manifest follows it.
test("choose a discreet identity before installing", async ({ couple }) => {
  const { a } = couple;
  await a.goto("/install");
  const notes = a.getByRole("radio", { name: "Notes" });
  await notes.click();
  await expect(notes).toHaveAttribute("aria-checked", "true");
  await expect(a.getByText("It will install as Notes.")).toBeVisible();
  const manifest = await (await a.request.get("/manifest.webmanifest")).json();
  expect(manifest.name).toBe("Notes");

  await a.goto("/settings");
  await expect(a.getByRole("radio", { name: "Notes" })).toHaveAttribute("aria-checked", "true");
  await a.getByRole("radio", { name: "Clink" }).click();
  await expect(a.getByText("Back to Clink.")).toBeVisible();
  expect((await (await a.request.get("/manifest.webmanifest")).json()).name).toBe("Clink");
});

import { test, expect } from "./fixtures";
import { admin } from "./helpers";

test("home city: find Takoradi, use a typed town with its country, change it from Settings", async ({
  couple,
}) => {
  const { a, nia } = couple;

  // Search matches any word of a name: Takoradi is Sekondi-Takoradi.
  const api = await (await a.request.get("/api/cities?q=Takoradi")).json();
  expect(
    api.cities.some(
      (c: { city: string; country: string }) => /Takoradi/.test(c.city) && c.country === "Ghana",
    ),
  ).toBe(true);

  // Settings opens just the city picker, not the onboarding steps.
  await a.goto("/settings?tab=profile");
  await a.getByRole("button", { name: /Change home city/ }).click();
  const sheet = a.getByRole("dialog", { name: "Home city" });
  await expect(sheet).toBeVisible();
  await expect(a.getByRole("radiogroup", { name: "Person" })).toHaveCount(0);

  await sheet.getByLabel("Search for your city").fill("Takoradi");
  await sheet
    .getByRole("option")
    .filter({ hasText: /Takoradi, Ghana/ })
    .first()
    .getByRole("button")
    .click();
  await sheet.getByRole("button", { name: "Save home city" }).click();
  await expect(a.getByText(/Home is now .*Takoradi/)).toBeVisible();
  await expect
    .poll(
      async () =>
        (await admin.from("profiles").select("timezone, home_city").eq("id", nia.id).single()).data,
    )
    .toMatchObject({ timezone: "Africa/Accra" });

  // A town that isn't listed: use what you typed and pick the country.
  await a.getByRole("button", { name: /Change home city/ }).click();
  await sheet.getByLabel("Search for your city").fill("Zzyzxtown");
  await sheet.getByRole("button", { name: /Use “Zzyzxtown”/ }).click();
  await sheet.getByLabel("Which country is Zzyzxtown in?").selectOption("Ghana");
  await sheet.getByRole("button", { name: "Save home city" }).click();
  await expect(a.getByText("Home is now Zzyzxtown.")).toBeVisible();
  await expect
    .poll(
      async () =>
        (
          await admin
            .from("profiles")
            .select("timezone, home_city, country")
            .eq("id", nia.id)
            .single()
        ).data,
    )
    .toMatchObject({ home_city: "Zzyzxtown", country: "Ghana", timezone: "Africa/Accra" });
});

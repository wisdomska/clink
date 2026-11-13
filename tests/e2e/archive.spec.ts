import { test, expect } from "./fixtures";

// ACC-07: after unlinking, both partners can read (not write) the old chat until it is purged.
test("unlinked chat stays readable, read only", async ({ couple }) => {
  const { a, b } = couple;
  const body = `see you at the station ${Date.now()}`;
  const sent = await a.request.post("/api/messages", {
    data: { clientId: crypto.randomUUID(), type: "text", body },
  });
  expect(sent.ok()).toBeTruthy();

  const { token } = await (
    await a.request.post("/api/couple/unlink", { data: { step: "start" } })
  ).json();
  expect(
    (await a.request.post("/api/couple/unlink", { data: { step: "confirm", token } })).ok(),
  ).toBeTruthy();

  for (const page of [a, b]) {
    await page.goto("/link");
    await expect(page.getByText(/Your old chat with .* is readable until/)).toBeVisible();
    await page.getByRole("link", { name: /Open it/ }).click();
    await page.waitForURL("**/archive");
    await expect(page.getByText(body)).toBeVisible();
    await expect(page.getByText(/Read only/)).toBeVisible();
    await expect(page.getByRole("textbox")).toHaveCount(0);
  }

  // Writing is refused by the server.
  const write = await b.request.post("/api/messages", {
    data: { clientId: crypto.randomUUID(), type: "text", body: "still there?" },
  });
  expect(write.ok()).toBeFalsy();
});

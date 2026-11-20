import { test, expect } from "./fixtures";

// A 1x1 webp, standing in for the small picture the server makes.
const PIXEL = "data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA";

test("links in chat are tappable and get a preview card made by the server", async ({ couple }) => {
  const { a, b } = couple;
  const asked: string[] = [];
  // Test machines can't reach outside sites; the card's data is stubbed here
  // (the fetching and safety checks are unit-tested).
  for (const p of [a, b])
    await p.route("**/api/link-preview?**", (route) => {
      asked.push(new URL(route.request().url()).searchParams.get("url")!);
      return route.fulfill({
        json: {
          ok: true,
          title: "Best waakye spots in Accra",
          description: "Ten places worth the queue.",
          site: "Ghana Eats",
          image: PIXEL,
        },
      });
    });
  // Nothing on the device ever loads from the linked site itself.
  const outside: string[] = [];
  b.on(
    "request",
    (r) => new URL(r.url()).hostname === "ghanaeats.example" && outside.push(r.url()),
  );

  await a.goto("/chat");
  const box = a.getByRole("textbox", { name: "Message Theo" });
  await box.fill("for saturday: https://ghanaeats.example/waakye.");
  await box.press("Control+Enter");
  await expect(
    a.getByRole("link", { name: "Link: Best waakye spots in Accra, Ghana Eats" }),
  ).toBeVisible({ timeout: 15000 });

  await b.goto("/chat");
  const link = b.getByRole("link", { name: "https://ghanaeats.example/waakye", exact: true });
  await expect(link).toBeVisible({ timeout: 15000 });
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", /noreferrer/);
  const card = b.getByRole("link", { name: "Link: Best waakye spots in Accra, Ghana Eats" });
  await expect(card).toBeVisible();
  await expect(card).toHaveAttribute("href", "https://ghanaeats.example/waakye");
  await expect(card.getByText("Ten places worth the queue.")).toBeVisible();
  await expect(b.getByRole("button", { name: /^Jump to latest/ })).toHaveCount(0);
  expect(asked).toContain("https://ghanaeats.example/waakye");
  expect(outside).toEqual([]);

  // The server refuses to fetch addresses inside a network.
  for (const url of [
    "http://localhost:3000/",
    "http://169.254.169.254/latest",
    "ftp://x.example/",
  ]) {
    const r = await b.request.get(`/api/link-preview?url=${encodeURIComponent(url)}`);
    expect(r.status(), url).toBe(400);
  }
});

import sharp from "sharp";
import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";

// DARK-09: one-tap face blur where the browser can detect faces, the brush everywhere else.
async function stripes() {
  const w = 400;
  const h = 400;
  const raw = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      raw.fill(Math.floor(x / 4) % 2 ? 255 : 0, (y * w + x) * 3, (y * w + x) * 3 + 3);
  return sharp(raw, { raw: { width: w, height: h, channels: 3 } })
    .png()
    .toBuffer();
}

/** Contrast inside the face box: high for sharp stripes, near zero once blurred. */
function contrast(p: Page) {
  return p.getByLabel("Your photo preview").evaluate((c: HTMLCanvasElement) => {
    const k = c.width / 400;
    const d = c.getContext("2d")!.getImageData(150 * k, 150 * k, 60 * k, 60 * k).data;
    let min = 255;
    let max = 0;
    for (let i = 0; i < d.length; i += 4) {
      min = Math.min(min, d[i]!);
      max = Math.max(max, d[i]!);
    }
    return max - min;
  });
}

async function openSend(p: Page) {
  expect(
    (await p.request.post("/api/dark/setup", { data: { pin: "2611", tiers: ["Flirty"] } })).ok(),
  ).toBeTruthy();
  await p.request.post("/api/dark/notice");
  await p.goto("/dark/vault");
  await p.getByRole("button", { name: "Send", exact: true }).click();
  await p.locator('input[type="file"]').setInputFiles({
    name: "us.png",
    mimeType: "image/png",
    buffer: await stripes(),
  });
  await expect(p.getByLabel("Your photo preview")).toBeVisible();
  await expect.poll(() => contrast(p)).toBeGreaterThan(200);
}

test("one tap blurs every detected face", async ({ couple }) => {
  const { a, b } = couple;
  await b.request.post("/api/dark/setup", { data: { pin: "2611", tiers: ["Flirty"] } });
  await b.request.post("/api/dark/notice");
  // Stand-in for the browser's Shape Detection API: one face in the middle.
  await a.addInitScript(() => {
    (window as unknown as { FaceDetector: unknown }).FaceDetector = class {
      async detect(src: HTMLCanvasElement) {
        const k = src.width / 400;
        return [{ boundingBox: { x: 120 * k, y: 120 * k, width: 120 * k, height: 120 * k } }];
      }
    };
  });
  await openSend(a);
  await a.getByRole("button", { name: "Face blur" }).click();
  await expect(a.getByRole("button", { name: "Face blur on" })).toBeVisible();
  expect(await contrast(a)).toBeLessThan(80);
});

test("without face detection it falls back to the brush", async ({ couple }) => {
  const { a, b } = couple;
  await b.request.post("/api/dark/setup", { data: { pin: "2611", tiers: ["Flirty"] } });
  await b.request.post("/api/dark/notice");
  await openSend(a);
  await a.getByRole("button", { name: "Face blur" }).click();
  await expect(a.getByText(/Auto face blur isn't available on this browser/)).toBeVisible();
  await expect(a.getByRole("button", { name: "Brush" })).toHaveAttribute("aria-pressed", "true");
});

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { test, expect } from "./fixtures";
import { admin } from "./helpers";

function clip(name: string, args: string[]) {
  const dir = mkdtempSync(path.join(tmpdir(), "clink-media-"));
  const out = path.join(dir, name);
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", ...args, out]);
  return readFileSync(out);
}

test.describe("sending photos and videos", () => {
  test("a 1080p video with sound sends, shrunk to at most 720p", async ({ couple }) => {
    test.setTimeout(180_000);
    const { a, b } = couple;
    // 4 s of 1080p test pattern with a tone, the way a camera roll clip arrives.
    const video = clip("clip.webm", [
      "-f",
      "lavfi",
      "-i",
      "testsrc2=size=1920x1080:rate=30:duration=4",
      "-f",
      "lavfi",
      "-i",
      "sine=frequency=440:duration=4",
      "-c:v",
      "libvpx",
      "-b:v",
      "4M",
      "-c:a",
      "libopus",
      "-shortest",
    ]);
    await a.goto("/chat");
    await b.goto("/chat");
    await a
      .getByTestId("attach-input")
      .setInputFiles({ name: "clip.webm", mimeType: "video/webm", buffer: video });
    await a.getByRole("button", { name: /^Send to / }).click();
    await expect(b.getByRole("link", { name: "Open media" })).toBeVisible({ timeout: 150000 });
    const { data: m } = await admin
      .from("media")
      .select("status, kind, width, height, duration_s")
      .eq("kind", "video")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    expect(m?.status).toBe("ready");
    expect(Math.max(m!.width!, m!.height!)).toBeLessThanOrEqual(1280);
    expect(Number(m!.duration_s)).toBeGreaterThan(3);
  });

  test("a very wide panorama sends", async ({ couple }) => {
    const { a, b } = couple;
    const pano = await sharp({
      create: { width: 12000, height: 1500, channels: 3, background: "#2B6CB0" },
    })
      .jpeg({ quality: 70 })
      .toBuffer();
    await a.goto("/chat");
    await b.goto("/chat");
    await a
      .getByTestId("attach-input")
      .setInputFiles({ name: "pano.jpg", mimeType: "image/jpeg", buffer: pano });
    await a.getByRole("button", { name: /^Send to / }).click();
    await expect(b.getByRole("link", { name: "Open media" })).toBeVisible({ timeout: 20000 });
    // It carries a tiny blurred preview to show while the real photo loads.
    const { data } = await admin
      .from("media")
      .select("placeholder")
      .eq("owner_id", couple.nia.id)
      .eq("kind", "image")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    expect(data?.placeholder).toMatch(/^data:image\/(webp|jpeg);base64,/);
    expect(data!.placeholder!.length).toBeLessThan(2000);
  });

  test("the server accepts iPhone .mov videos and videos up to 3 minutes", async ({ couple }) => {
    const { a } = couple;
    await a.goto("/chat");
    const r = await a.request.post("/api/media/upload-url", {
      data: { kind: "video", mime: "video/quicktime", size: 30_000_000, durationS: 170 },
    });
    expect(r.status()).toBe(200);
    const tooLong = await a.request.post("/api/media/upload-url", {
      data: { kind: "video", mime: "video/mp4", size: 1_000_000, durationS: 200 },
    });
    expect(tooLong.status()).toBe(413);
  });
});

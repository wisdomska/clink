/**
 * Pose avatars (Snapchat-style picker): Microsoft Fluent Emoji 3D people (MIT),
 * 14 poses x woman/man x 6 skin tones, saved as 192 px WebP in public/avatars/p.
 * Run: node scripts/fetch-pose-avatars.mjs
 */
import sharp from "sharp";
import { mkdirSync } from "node:fs";
const base = "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/";
export const POSES = [
  ["wave", "raising hand"],
  ["ok", "gesturing ok"],
  ["sass", "tipping hand"],
  ["shrug", "shrugging"],
  ["facepalm", "facepalming"],
  ["dance", "dancing"],
  ["run", "running"],
  ["gym", "lifting weights"],
  ["zen", "in lotus position"],
  ["tech", "technologist"],
  ["artist", "artist"],
  ["singer", "singer"],
  ["cook", "cook"],
  ["hero", "superhero"],
];
const TONES = [
  ["d", "Default"],
  ["l", "Light"],
  ["ml", "Medium-Light"],
  ["m", "Medium"],
  ["md", "Medium-Dark"],
  ["k", "Dark"],
];
mkdirSync("public/avatars/p", { recursive: true });
let miss = 0;
for (const [g, word] of [
  ["w", "Woman"],
  ["m", "Man"],
]) {
  for (const [key, pose] of POSES) {
    for (const [t, tone] of TONES) {
      const folder = `${word} ${pose}`;
      const file = `${folder.toLowerCase().replace(/ /g, "_")}_3d_${tone.toLowerCase()}.png`;
      const url = base + [folder, tone, "3D", file].map(encodeURIComponent).join("/");
      const r = await fetch(url);
      if (!r.ok) {
        console.log("MISS", g, key, t, r.status);
        miss++;
        continue;
      }
      const buf = Buffer.from(await r.arrayBuffer());
      await sharp(buf)
        .resize(192, 192, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: 80 })
        .toFile(`public/avatars/p/${g}-${key}-${t}.webp`);
    }
  }
}
console.log("done, missing:", miss);

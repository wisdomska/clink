/**
 * Renders the Clink mark to PNG app icons (plain, maskable, Apple, badge,
 * favicon) and a preview sheet. Run: node scripts/brand-icons.mjs [--preview]
 */
import sharp from "sharp";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const src = readFileSync("src/components/brand/mark-paths.ts", "utf8");
const get = (k) => new RegExp(`${k}:\\s*"([^"]+)"`).exec(src)[1];
const P = {
  left: get("left"),
  right: get("right"),
  lf: get("leftFizz"),
  rf: get("rightFizz"),
  spark: get("spark"),
};

export function markSvg({ bg = true, pad = 0.18, round = 0.22, size = 1024, rotate = 9 } = {}) {
  const inner = size * (1 - pad * 2) * 0.92;
  const scale = inner / 80;
  const ox = (size - 64 * scale) / 2;
  const oy = (size - 80 * scale) / 2 + size * 0.02;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
<defs>
<radialGradient id="bg" cx="30%" cy="20%" r="95%"><stop offset="0" stop-color="#3a1424"/><stop offset=".55" stop-color="#1b1016"/><stop offset="1" stop-color="#0e080b"/></radialGradient>
<linearGradient id="l" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFB3C4"/><stop offset=".45" stop-color="#FF4F7B"/><stop offset="1" stop-color="#D9305E"/></linearGradient>
<linearGradient id="r" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFD08A"/><stop offset=".5" stop-color="#FF7A5C"/><stop offset="1" stop-color="#FF5A3C"/></linearGradient>
<radialGradient id="glow" cx="50%" cy="10%" r="40%"><stop offset="0" stop-color="#FFD08A" stop-opacity=".45"/><stop offset="1" stop-color="#FFD08A" stop-opacity="0"/></radialGradient>
</defs>
${bg ? `<rect width="${size}" height="${size}" rx="${size * round}" fill="url(#bg)"/><rect width="${size}" height="${size}" rx="${size * round}" fill="url(#glow)"/>` : ""}
<g transform="translate(${ox} ${oy}) scale(${scale})">
<g transform="rotate(${rotate} 32 15)"><path d="${P.left}" fill="url(#l)"/><path d="${P.lf}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2.2" stroke-linecap="round"/></g>
<g transform="rotate(${-rotate} 32 15)"><path d="${P.right}" fill="url(#r)"/><path d="${P.rf}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2.2" stroke-linecap="round"/></g>
<path d="${P.spark}" fill="#FFD08A"/>
</g></svg>`;
}

const preview = process.argv.includes("--preview");
if (preview) {
  await sharp(Buffer.from(markSvg({})))
    .resize(512)
    .png()
    .toFile(process.argv[3] ?? "preview.png");
} else {
  mkdirSync("public/icons", { recursive: true });
  const out = async (name, opts, px) =>
    sharp(Buffer.from(markSvg(opts)))
      .resize(px)
      .png()
      .toFile(`public/icons/${name}`);
  await out("clink-512.png", {}, 512);
  await out("clink-192.png", {}, 192);
  await out("clink-apple-180.png", { round: 0 }, 180);
  await out("clink-maskable-512.png", { round: 0, pad: 0.26 }, 512);
  await out("clink-maskable-192.png", { round: 0, pad: 0.26 }, 192);
  // Monochrome badge for notifications (white silhouette on transparent).
  const badge = markSvg({ bg: false, pad: 0.08 })
    .replace(/fill="url\(#[lr]\)"/g, 'fill="#fff"')
    .replace(/fill="#FFD08A"/g, 'fill="#fff"');
  await sharp(Buffer.from(badge)).resize(96).png().toFile("public/icons/badge-96.png");
  // Favicon + SVG icon.
  writeFileSync("public/icons/clink.svg", markSvg({ size: 64 }));
  await sharp(Buffer.from(markSvg({})))
    .resize(64)
    .png()
    .toFile("public/favicon.png");
  console.log("icons written");
}

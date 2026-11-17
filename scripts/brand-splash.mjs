// iOS launch screens for the installed app: the Clink mark on Night, at each
// current iPhone and iPad size (portrait), so opening Clink never flashes white.
// Run: node scripts/brand-splash.mjs  (writes public/splash/*.png)
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const src = readFileSync("src/components/brand/mark-paths.ts", "utf8");
const pick = (k) => new RegExp(`${k}:\\s*\\n?\\s*"([^"]+)"`).exec(src)[1];
const MARK = { left: pick("left"), right: pick("right"), spark: pick("spark") };

// css width x height @ device pixel ratio
export const SPLASH = [
  [440, 956, 3], // iPhone 16 Pro Max
  [402, 874, 3], // iPhone 16 Pro
  [430, 932, 3], // iPhone 14/15 Pro Max, 15/16 Plus
  [393, 852, 3], // iPhone 14/15 Pro, 15/16
  [390, 844, 3], // iPhone 12/13/14
  [428, 926, 3], // iPhone 12/13 Pro Max, 14 Plus
  [375, 812, 3], // iPhone X/XS/11 Pro, 12/13 mini
  [414, 896, 3], // iPhone XS Max, 11 Pro Max
  [414, 896, 2], // iPhone XR, 11
  [375, 667, 2], // iPhone SE, 8
  [1024, 1366, 2], // iPad Pro 12.9"
  [834, 1194, 2], // iPad Pro 11"
  [820, 1180, 2], // iPad Air
  [768, 1024, 2], // iPad mini, iPad 9th
];

function svg(w, h) {
  const markH = Math.round(Math.min(w, h) * 0.22);
  const markW = Math.round((markH * 64) / 80);
  const x = Math.round((w - markW) / 2);
  const y = Math.round(h / 2 - markH * 0.65);
  const fs = Math.round(markH * 0.42);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <radialGradient id="glow" cx="50%" cy="46%" r="45%">
      <stop offset="0" stop-color="#FF4F7B" stop-opacity=".22"/>
      <stop offset="1" stop-color="#120C10" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFB3C4"/><stop offset="1" stop-color="#FF4F7B"/></linearGradient>
    <linearGradient id="r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFD08A"/><stop offset="1" stop-color="#FF5A3C"/></linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="#120C10"/>
  <rect width="100%" height="100%" fill="url(#glow)"/>
  <svg x="${x}" y="${y}" width="${markW}" height="${markH}" viewBox="0 0 64 80">
    <g transform="rotate(-9 32 15)"><path d="${MARK.left}" fill="url(#l)"/></g>
    <g transform="rotate(9 32 15)"><path d="${MARK.right}" fill="url(#r)"/></g>
    <path d="${MARK.spark}" fill="#FFD08A"/>
  </svg>
  <text x="50%" y="${y + markH + Math.round(fs * 1.5)}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="800" font-size="${fs}" letter-spacing="-1" fill="#FBF3F6">clink</text>
</svg>`;
}

mkdirSync("public/splash", { recursive: true });
const links = [];
for (const [cw, ch, dpr] of SPLASH) {
  const w = cw * dpr;
  const h = ch * dpr;
  const name = `splash-${w}x${h}.png`;
  await sharp(Buffer.from(svg(w, h)))
    .png({ compressionLevel: 9 })
    .toFile(`public/splash/${name}`);
  links.push({
    url: `/splash/${name}`,
    media: `(device-width: ${cw}px) and (device-height: ${ch}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)`,
  });
}
writeFileSync("src/lib/splash.json", JSON.stringify(links, null, 2) + "\n");
console.log(`wrote ${links.length} launch screens`);

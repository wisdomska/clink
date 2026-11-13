/**
 * Renders the PWA icons (Clink, plus the discreet Notes and Weather variants)
 * from Phosphor glyphs into PNGs. Run: pnpm icons
 */
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import sharp from "sharp";
import { Wine, NotePencil, CloudSun } from "@phosphor-icons/react/dist/ssr";
import { mkdirSync } from "node:fs";

const variants = [
  { key: "clink", Icon: Wine, bg: "#E68AF5", fg: "#0F0E11" },
  { key: "notes", Icon: NotePencil, bg: "#2C2830", fg: "#F4F0F5" },
  { key: "weather", Icon: CloudSun, bg: "#2C2830", fg: "#F4F0F5" },
] as const;

async function render(Icon: typeof Wine, bg: string, fg: string, size: number, pad: number, maskable: boolean) {
  const glyph = renderToStaticMarkup(createElement(Icon, { size: size - pad * 2, color: fg }));
  const radius = maskable ? 0 : Math.round(size * 0.22);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="${bg}"/><g transform="translate(${pad} ${pad})">${glyph}</g></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function main() {
  mkdirSync("public/icons", { recursive: true });
  for (const v of variants) {
    for (const size of [192, 512]) {
      await sharp(await render(v.Icon, v.bg, v.fg, size, Math.round(size * 0.2), false)).toFile(`public/icons/${v.key}-${size}.png`);
      await sharp(await render(v.Icon, v.bg, v.fg, size, Math.round(size * 0.28), true)).toFile(`public/icons/${v.key}-maskable-${size}.png`);
    }
    await sharp(await render(v.Icon, v.bg, v.fg, 180, 36, true)).toFile(`public/icons/${v.key}-apple-180.png`);
  }
  await sharp(await render(Wine, "#E68AF5", "#0F0E11", 96, 18, false)).toFile("public/icons/badge-96.png");
  await sharp(await render(Wine, "#E68AF5", "#0F0E11", 48, 8, false)).toFile("public/favicon.png");
  console.warn("icons written");
}
main();

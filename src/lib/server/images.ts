import "server-only";
import sharp from "sharp";

/** Server half of SAF-03: decode and re-encode, which drops EXIF, XMP, ICC and GPS. */
export async function stripImage(input: Buffer, maxSide = 2048): Promise<{ data: Buffer; width: number; height: number }> {
  const img = sharp(input, { failOn: "error", limitInputPixels: 64_000_000 }).rotate();
  const out = await img
    .resize({ width: maxSide, height: maxSide, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer({ resolveWithObject: true });
  return { data: out.data, width: out.info.width, height: out.info.height };
}

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);
}

/** SAF-04: faint viewer name and timestamp, tiled, burned in at view time. */
export async function watermark(input: Buffer, label: string): Promise<Buffer> {
  const meta = await sharp(input).metadata();
  const w = meta.width ?? 1024;
  const h = meta.height ?? 1024;
  const size = Math.max(14, Math.round(Math.min(w, h) / 28));
  const text = escapeXml(label.toUpperCase());
  const rows: string[] = [];
  for (let y = size * 3; y < h + size * 3; y += size * 7) {
    for (let x = -w * 0.2; x < w; x += size * 16) {
      rows.push(`<text x="${x}" y="${y}" transform="rotate(-24 ${x} ${y})">${text}</text>`);
    }
  }
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><g font-family="monospace" font-size="${size}" fill="rgba(244,240,245,0.22)">${rows.join("")}</g></svg>`,
  );
  return sharp(input).composite([{ input: svg, top: 0, left: 0 }]).webp({ quality: 85 }).toBuffer();
}

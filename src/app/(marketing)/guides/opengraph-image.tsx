import { renderOg, OG_SIZE } from "@/lib/og/render";

export const alt = "Guides for couples from Clink";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOg({
    eyebrow: "Guides",
    title: "Staying close, near and far.",
    body: "Date ideas, games, tips and questions for couples.",
    art: "sparkling_heart",
  });
}

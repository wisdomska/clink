import { renderOg, OG_SIZE } from "@/lib/og/render";

export const alt = "Clink terms";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOg({
    eyebrow: "Terms",
    title: "The small print, kept small.",
    body: "How Clink works for the two of you.",
  });
}

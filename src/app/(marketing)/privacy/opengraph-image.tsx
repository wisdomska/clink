import { renderOg, OG_SIZE } from "@/lib/og/render";

export const alt = "Clink privacy";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOg({
    eyebrow: "Privacy",
    title: "Yours stays yours.",
    body: "What Clink keeps, what it never does, and how to take it all with you.",
  });
}

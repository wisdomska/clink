import { renderOg, OG_SIZE } from "@/lib/og/render";

export const alt = "Clink";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOg({
    eyebrow: "About",
    title: "An app for two people.",
    body: "Private by design, adults only, free.",
    art: "sparkling_heart",
  });
}

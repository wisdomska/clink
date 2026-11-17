import { renderOg, OG_SIZE } from "@/lib/og/render";

export const alt = "Clink safety";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOg({
    eyebrow: "Safety",
    title: "Safe, private, always your call.",
    body: "Consent first, private media that disappears, and help whenever you need it.",
  });
}

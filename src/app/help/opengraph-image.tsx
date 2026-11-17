import { renderOg, OG_SIZE } from "@/lib/og/render";

export const alt = "Clink help";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOg({
    eyebrow: "Help",
    title: "Help and safety.",
    body: "Answers, and a private way to reach us.",
  });
}

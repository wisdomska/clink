import { renderOg, OG_SIZE } from "@/lib/og/render";

export const alt = "Clink";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOg({
    eyebrow: "Long distance",
    title: "Two people, two time zones, one app.",
    body: "Clinks, calls, games and countdowns for couples apart.",
    art: "sparkling_heart",
  });
}

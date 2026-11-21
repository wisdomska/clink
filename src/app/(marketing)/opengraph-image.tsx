import { renderOg, OG_SIZE } from "@/lib/og/render";

// The two of them as on the home page (lib/og/render.tsx, Pair). This file's
// content sets the image URL's version, so a redesign changes it here too and
// social apps fetch the new picture instead of their cached one.
const VERSION = 2;
export const alt =
  "Clink: Ama in Accra and Theo in New York, 8,200 km apart, two people, one clink";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOg({
    title: "Two people, one clink.",
    body: "Calls, chat, games, letters and date nights for the two of you, together or apart.",
    people: true,
    version: VERSION,
  });
}

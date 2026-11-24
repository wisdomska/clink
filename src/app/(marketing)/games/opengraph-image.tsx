import { renderOg, OG_SIZE } from "@/lib/og/render";

export const alt = "Games for couples on Clink";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOg({
    eyebrow: "Games for two",
    title: "Thirteen games made for two.",
    body: "Oware, Draughts, Draw and guess and more. Live or turn by turn.",
    art: "oware",
  });
}

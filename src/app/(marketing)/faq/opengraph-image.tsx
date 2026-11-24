import { renderOg, OG_SIZE } from "@/lib/og/render";

export const alt = "Clink";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOg({
    eyebrow: "FAQ",
    title: "Questions about Clink.",
    body: "How linking, games, privacy and After Dark work.",
    art: "question",
  });
}

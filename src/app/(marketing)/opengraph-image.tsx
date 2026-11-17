import { renderOg, OG_SIZE } from "@/lib/og/render";

export const alt = "Clink: two people, one clink";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOg({
    title: "Two people, one clink.",
    body: "Calls, chat, games, letters and date nights for the two of you, together or apart.",
    people: true,
  });
}

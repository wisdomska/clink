import type { Metadata } from "next";
import { MediaGallery } from "@/features/chat/media-gallery";

export const metadata: Metadata = { title: "Photos and videos" };

export default function Page() {
  return <MediaGallery />;
}

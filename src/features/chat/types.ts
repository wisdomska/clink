import type { Database } from "@/types/database";

export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type Reaction = Database["public"]["Tables"]["reactions"]["Row"];
export interface MediaInfo {
  id: string;
  kind: "image" | "video" | "audio";
  mime: string;
  duration_s: number | null;
  width: number | null;
  height: number | null;
  waveform: number[] | null;
  status: string;
  is_favourite: boolean;
  /** Tiny blurred preview shown while the photo loads. */
  placeholder: string | null;
}
/** A message as the UI sees it, including local (queued) ones. */
export interface UiMessage extends Message {
  local?: "sending" | "failed";
  localMedia?: Array<{ url: string; kind: "image" | "video" | "audio"; progress?: number }>;
}

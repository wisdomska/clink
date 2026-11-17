import type { Metadata } from "next";
import { TimelineScreen } from "@/features/keep/timeline";

export const metadata: Metadata = { title: "Timeline" };

export default function Page() {
  return <TimelineScreen />;
}

import type { Metadata } from "next";
import { LadderScreen } from "@/features/play/ladder";

export const metadata: Metadata = { title: "Daily ladder" };

export default function LadderPage() {
  return <LadderScreen />;
}

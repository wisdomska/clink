import type { Metadata } from "next";
import { Lobby } from "@/features/play/lobby";

export const metadata: Metadata = { title: "Play" };

export default function PlayPage() {
  return <Lobby />;
}

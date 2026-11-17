import type { Metadata } from "next";
import { GameRoom } from "@/features/play/rooms/room";

export const metadata: Metadata = { title: "Game" };

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GameRoom id={id} />;
}

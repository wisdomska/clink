import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PracticeRoom } from "@/features/play/rooms/practice-room";
import { isBoardType } from "@/features/play/engines/boards";

export const metadata: Metadata = { title: "Practice" };

export default async function PracticePage({ params }: { params: Promise<{ game: string }> }) {
  const { game } = await params;
  if (!isBoardType(game)) notFound();
  return <PracticeRoom kind={game} />;
}

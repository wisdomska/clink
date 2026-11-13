import type { Metadata } from "next";
import { ChallengeScreen } from "@/features/plans/challenge";

export const metadata: Metadata = { title: "Challenge" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <ChallengeScreen id={(await params).id} />;
}

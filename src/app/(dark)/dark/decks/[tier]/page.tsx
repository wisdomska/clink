import { Deck } from "@/features/dark/deck";

export default async function Page({ params }: { params: Promise<{ tier: string }> }) {
  return <Deck tier={decodeURIComponent((await params).tier)} />;
}

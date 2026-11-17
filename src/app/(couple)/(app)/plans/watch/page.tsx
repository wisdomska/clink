import type { Metadata } from "next";
import { WatchStart } from "@/features/plans/watch-start";

export const metadata: Metadata = { title: "Watch party" };

export default function Page() {
  return <WatchStart />;
}

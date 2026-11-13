import type { Metadata } from "next";
import { Roulette } from "@/features/plans/roulette";

export const metadata: Metadata = { title: "Date roulette" };

export default function Page() {
  return <Roulette />;
}

import type { Metadata } from "next";
import { PlansHub } from "@/features/plans/plans-hub";

export const metadata: Metadata = { title: "Plans" };

export default function PlansPage() {
  return <PlansHub />;
}

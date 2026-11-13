import type { Metadata } from "next";
import { ListenTogether } from "@/features/plans/listen";

export const metadata: Metadata = { title: "Listen together" };

export default function Page() {
  return <ListenTogether />;
}

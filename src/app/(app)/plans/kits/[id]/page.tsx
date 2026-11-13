import type { Metadata } from "next";
import { KitDetail } from "@/features/plans/kit-detail";

export const metadata: Metadata = { title: "Date kit" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <KitDetail id={(await params).id} />;
}

import type { Metadata } from "next";
import { BucketList } from "@/features/plans/bucket-list";

export const metadata: Metadata = { title: "Our list" };

export default function Page() {
  return <BucketList />;
}

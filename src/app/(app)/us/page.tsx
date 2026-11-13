import { Suspense } from "react";
import type { Metadata } from "next";
import { UsScreen } from "@/features/home/us-screen";

export const metadata: Metadata = { title: "Us" };

export default function UsPage() {
  return (
    <Suspense>
      <UsScreen />
    </Suspense>
  );
}

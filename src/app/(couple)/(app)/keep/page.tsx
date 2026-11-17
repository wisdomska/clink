import { Suspense } from "react";
import type { Metadata } from "next";
import { KeepHub } from "@/features/keep/keep-hub";

export const metadata: Metadata = { title: "Keep" };

export default function KeepPage() {
  return (
    <Suspense>
      <KeepHub />
    </Suspense>
  );
}

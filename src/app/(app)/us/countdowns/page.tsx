import { Suspense } from "react";
import type { Metadata } from "next";
import { CountdownsScreen } from "@/features/home/countdowns-screen";

export const metadata: Metadata = { title: "Countdowns" };

export default function Page() {
  return (
    <Suspense>
      <CountdownsScreen />
    </Suspense>
  );
}

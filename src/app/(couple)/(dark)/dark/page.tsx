import { Suspense } from "react";
import { LockScreen } from "@/features/dark/lock-screen";

export default function DarkLock() {
  return (
    <Suspense>
      <LockScreen />
    </Suspense>
  );
}

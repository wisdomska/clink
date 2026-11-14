"use client";

import { CrashScreen } from "@/components/clink/crash-screen";

export default function Error(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <CrashScreen {...props} />;
}

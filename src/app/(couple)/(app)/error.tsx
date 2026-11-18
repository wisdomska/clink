"use client";

import { CrashScreen } from "@/components/clink/crash-screen";

/** A crash stays inside this part of the app: the shell and any call keep running. */
export default function Error(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <CrashScreen {...props} inline />;
}

"use client";

import { CrashScreen } from "@/components/clink/crash-screen";
import "@/styles/globals.css";

/** Replaces the root layout when it fails, so it brings its own html and body. */
export default function GlobalError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en-GB">
      <body>
        <CrashScreen {...props} />
      </body>
    </html>
  );
}

import { Suspense } from "react";

/**
 * One landing section below the fold, in its own Suspense boundary so React
 * hydrates it as a separate unit after the hero instead of in one long task
 * with the whole page. Nothing inside suspends, so the server HTML is
 * complete on first paint and there is no fallback.
 */
export function Fold({ children }: { children: React.ReactNode }) {
  return <Suspense>{children}</Suspense>;
}

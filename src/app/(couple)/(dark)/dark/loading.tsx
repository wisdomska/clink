import { DarkSkeleton } from "@/features/dark/dark-skeleton";

/** Moving between After Dark screens shows the same skeleton, never a blank. */
export default function Loading() {
  return <DarkSkeleton />;
}

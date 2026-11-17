import { Suspense } from "react";
import { Consent } from "@/features/dark/consent";

export default function Page() {
  return (
    <Suspense>
      <Consent />
    </Suspense>
  );
}

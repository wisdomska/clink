import { headers } from "next/headers";
import { loadCoupleContext } from "@/lib/server/couple-context";
import { CoupleProvider } from "@/features/couple/context";
import { CallProvider } from "@/features/call/call-provider";
import { QueryProvider } from "@/features/couple/query-provider";
import { OfflineSaves } from "@/components/clink/offline-saves";

/**
 * Shared by the app and After Dark, so moving between them never remounts
 * the couple's live connection or a call in progress: a call keeps going
 * while you open After Dark, and an incoming one still rings there.
 */
export default async function CoupleLayout({ children }: { children: React.ReactNode }) {
  const path = (await headers()).get("x-pathname") ?? "/us";
  const ctx = await loadCoupleContext(path);
  return (
    <QueryProvider>
      <CoupleProvider value={ctx}>
        <OfflineSaves />
        <CallProvider>{children}</CallProvider>
      </CoupleProvider>
    </QueryProvider>
  );
}

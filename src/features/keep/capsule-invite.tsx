"use client";
import { usePathname, useRouter } from "next/navigation";
import { useCouple, useCoupleEvent } from "@/features/couple/context";
import { toast } from "@/components/ui/toast";

/**
 * Anywhere in the app: when your partner wants to open a time capsule with
 * you, a prompt with Join, which takes you there and starts the countdown.
 * (On the capsule itself, the screen asks instead.)
 */
export function CapsuleInvites() {
  const { partner } = useCouple();
  const path = usePathname();
  const router = useRouter();
  useCoupleEvent("capsule.ask", (p) => {
    const id = String(p.id ?? "");
    if (!/^[0-9a-f-]{36}$/.test(id) || path === `/keep/capsules/${id}`) return;
    const title = typeof p.title === "string" ? p.title.slice(0, 60) : "a time capsule";
    toast(`${partner.name} wants to open “${title}” with you now.`, {
      action: { label: "Join", onClick: () => router.push(`/keep/capsules/${id}?join=1`) },
      duration: 30_000,
    });
  });
  return null;
}

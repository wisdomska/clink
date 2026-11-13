"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Landing "installed-PWA redirect" state: the home-screen app opens straight into Us. */
export function InstalledRedirect() {
  const router = useRouter();
  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) router.replace("/us");
  }, [router]);
  return null;
}

import splash from "@/lib/splash.json";
import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { cabinet, satoshi, geistMono } from "@/lib/fonts";
import { siteUrl } from "@/lib/site";
import { IDENTITIES, IDENTITY_COOKIE, asIdentity } from "@/lib/app-identity";
import { Toaster } from "@/components/ui/toast";
import { ServiceWorker } from "@/components/clink/sw-register";
import { Hydrated } from "@/components/clink/hydrated";
import { FeedbackRoot } from "@/components/clink/feedback-root";
import "@/styles/globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const id = asIdentity((await cookies()).get(IDENTITY_COOKIE)?.value);
  const name = IDENTITIES[id].name;
  return {
    metadataBase: new URL(siteUrl()),
    title: {
      default: id === "clink" ? "Clink: Made for two" : name,
      template: `%s · ${name}`,
    },
    description:
      "Games, dates, dares and letters for two people, together or apart. An 18+ app for couples.",
    applicationName: name,
    manifest: "/manifest.webmanifest",
    icons: {
      icon: [{ url: "/favicon.png", type: "image/png" }],
      apple: `/icons/${id}-apple-180.png`,
    },
    appleWebApp: {
      capable: true,
      title: name,
      statusBarStyle: "black-translucent",
      // Launch screens for the installed app (scripts/brand-splash.mjs): no white flash.
      startupImage: splash,
    },
    formatDetection: { telephone: false },
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#120C10",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${cabinet.variable} ${satoshi.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <FeedbackRoot>{children}</FeedbackRoot>
        <Toaster />
        <ServiceWorker />
        <Hydrated />
        <div className="grain" aria-hidden="true" />
      </body>
    </html>
  );
}

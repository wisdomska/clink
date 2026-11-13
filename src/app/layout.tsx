import type { Metadata, Viewport } from "next";
import { cabinet, satoshi, geistMono } from "@/lib/fonts";
import { siteUrl } from "@/lib/site";
import "@/styles/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "Clink: do things together, from apart", template: "%s · Clink" },
  description:
    "Games, dates, dares and letters for two people in two places. An 18+ app for long-distance couples.",
  applicationName: "Clink",
  appleWebApp: { capable: true, title: "Clink", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0F0E11",
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
        {children}
        <div className="grain" aria-hidden="true" />
      </body>
    </html>
  );
}

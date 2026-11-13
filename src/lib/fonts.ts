import localFont from "next/font/local";

export const cabinet = localFont({
  src: [{ path: "../fonts/CabinetGrotesk-Extrabold.woff2", weight: "800", style: "normal" }],
  variable: "--font-cabinet",
  display: "swap",
  preload: true,
});

export const satoshi = localFont({
  src: [
    { path: "../fonts/Satoshi-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/Satoshi-Medium.woff2", weight: "500", style: "normal" },
    { path: "../fonts/Satoshi-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-satoshi",
  display: "swap",
  preload: true,
});

export const geistMono = localFont({
  src: [{ path: "../fonts/GeistMono-Medium.woff2", weight: "500", style: "normal" }],
  variable: "--font-geist-mono",
  display: "swap",
  preload: false,
});

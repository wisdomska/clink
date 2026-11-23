import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  reloadOnOnline: false,
});

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(self), microphone=(self), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const noStore = [{ key: "Cache-Control", value: "no-store, max-age=0" }];
const noIndex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  typedRoutes: false,
  outputFileTracingIncludes: {
    "/api/games/*": ["./node_modules/word-list/words.txt"],
    "/api/ladder": ["./node_modules/word-list/words.txt"],
    "/api/ladder/*": ["./node_modules/word-list/words.txt"],
  },
  // Deployment Storage: Vercel Functions run on glibc Linux, so the musl
  // (Alpine) builds of sharp's libvips are dead weight (~19 MB per image route).
  outputFileTracingExcludes: {
    "*": [
      "**/@img/sharp-libvips-linuxmusl-*/**",
      "**/@img/sharp-linuxmusl-*/**",
      "**/@img/sharp-*-darwin-*/**",
      "**/@img/sharp-win32-*/**",
    ],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // After Dark, media and admin are never cached and never indexed.
      { source: "/dark/:path*", headers: [...noStore, ...noIndex] },
      { source: "/dark", headers: [...noStore, ...noIndex] },
      { source: "/api/media/:path*", headers: noStore },
      { source: "/api/dark/:path*", headers: noStore },
      { source: "/admin/:path*", headers: [...noStore, ...noIndex] },
      { source: "/admin", headers: [...noStore, ...noIndex] },
    ];
  },
};

export default withSerwist(nextConfig);

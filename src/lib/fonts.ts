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

// Subset to Latin, punctuation, currency, arrows, maths and shapes, unhinted
// like Satoshi (51 KB to 24 KB; it loads on every page). To redo it from the
// upstream Geist Mono Medium with fonttools:
//   pyftsubset GeistMono-Medium.woff2 --flavor=woff2 --layout-features='*' --no-hinting \
//     --unicodes="U+0000-024F,U+0259,U+02B0-036F,U+1E00-1EFF,U+2000-22FF,U+25A0-25FF,U+2713-2717,U+FEFF,U+FFFD"
export const geistMono = localFont({
  src: [{ path: "../fonts/GeistMono-Medium.woff2", weight: "500", style: "normal" }],
  variable: "--font-geist-mono",
  display: "swap",
  preload: false,
});

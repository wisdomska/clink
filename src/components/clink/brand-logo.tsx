import {
  siWhatsapp,
  siYoutube,
  siInstagram,
  siSnapchat,
  siTelegram,
  siMessenger,
  siX,
  siGmail,
  siSpotify,
  siApplemusic,
} from "simple-icons";
import { cn } from "@/components/ui/cn";

/**
 * Official third-party marks, never redrawn:
 * - Google: the four-colour "G" from Google's sign-in branding guidelines.
 * - Everything else: Simple Icons (CC0), traced from each brand's official
 *   assets, shown in the official brand colours.
 * "badge" sits the mark on a small white circle so it keeps its true colours on
 * Clink's dark surfaces. "tile" is the app-icon look used in the share menu
 * (brand background, white mark), following each brand's own icon treatment.
 * There is deliberately no FaceTime mark: Apple doesn't license its app icons.
 */
export type Brand =
  | "google"
  | "whatsapp"
  | "youtube"
  | "instagram"
  | "snapchat"
  | "telegram"
  | "messenger"
  | "x"
  | "gmail"
  | "spotify"
  | "apple_music";

function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className="h-[62%] w-[62%]">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

const SIMPLE = {
  whatsapp: siWhatsapp,
  youtube: siYoutube,
  instagram: siInstagram,
  snapchat: siSnapchat,
  telegram: siTelegram,
  messenger: siMessenger,
  x: siX,
  gmail: siGmail,
  spotify: siSpotify,
  apple_music: siApplemusic,
} as const;

/** App-icon backgrounds, from each brand's own icon. */
const TILE_BG: Partial<Record<Brand, string>> = {
  whatsapp: "#25D366",
  instagram:
    "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)",
  snapchat: "#FFFC00",
  telegram: "#26A5E4",
  messenger:
    "radial-gradient(circle at 20% 100%, #0099FF 0%, #A033FF 60%, #FF5280 90%, #FF7061 100%)",
  x: "#000000",
  youtube: "#FFFFFF",
  gmail: "#FFFFFF",
  google: "#FFFFFF",
  spotify: "#1ED760",
  apple_music: "#FA243C",
};

export function BrandLogo({
  brand,
  size = 24,
  variant = "badge",
  className,
}: {
  brand: Brand;
  size?: number;
  variant?: "badge" | "tile";
  className?: string;
}) {
  const tile = variant === "tile";
  const bg = tile ? (TILE_BG[brand] ?? "#fff") : "#fff";
  const light = !tile || bg === "#FFFFFF" || bg === "#fff";
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex flex-none items-center justify-center",
        tile ? "rounded-[28%] shadow-[inset_0_0_0_1px_rgba(255,255,255,.08)]" : "rounded-full",
        className,
      )}
      style={{ width: size, height: size, background: bg }}
    >
      {brand === "google" ? (
        <GoogleG />
      ) : (
        <svg
          viewBox="0 0 24 24"
          className={tile ? "h-[58%] w-[58%]" : "h-[64%] w-[64%]"}
          aria-hidden
        >
          <path
            d={SIMPLE[brand].path}
            fill={light ? `#${SIMPLE[brand].hex}` : "#FFFFFF"}
            stroke={tile && brand === "snapchat" ? "#000" : undefined}
            strokeWidth={tile && brand === "snapchat" ? 1.1 : undefined}
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}

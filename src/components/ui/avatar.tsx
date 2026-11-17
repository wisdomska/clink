import { cn } from "./cn";
import { AVATAR_KEYS, avatarFrame, avatarSrc, toMemoji, type AvatarKey } from "@/lib/avatars";

export type AvatarIcon = AvatarKey;
export const AVATAR_ICONS = AVATAR_KEYS;

/**
 * Partner avatars from the prototype: you = surface-2 with accent ring,
 * partner = surface-3 with partner-B ring. Shows the photo, else the initial.
 */
export function Avatar({
  name,
  side,
  size = 56,
  sizes,
  ring = 0,
  photoUrl,
  icon,
  dim,
  className,
  children,
}: {
  name: string;
  side: "me" | "partner";
  size?: number;
  /** Bigger on larger screens: tablet (md), laptop (lg), large desktop (xl, 1536+). */
  sizes?: { md?: number; lg?: number; xl?: number };
  ring?: number;
  photoUrl?: string | null;
  icon?: AvatarIcon | null;
  dim?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const initial = (name.trim()[0] ?? "?").toUpperCase();
  // Old keys (Fluent poses, classic faces) still render, as their memoji.
  const memoji = toMemoji(icon);
  const ringColor = side === "me" ? "var(--partner-a)" : dim ? "var(--line)" : "var(--partner-b)";
  return (
    <div
      className={cn(
        "display avatar-r relative flex flex-none items-center justify-center rounded-full",
        className,
      )}
      style={
        {
          "--av-0": `${size}px`,
          ...(sizes?.md ? { "--av-md": `${sizes.md}px` } : {}),
          ...(sizes?.lg ? { "--av-lg": `${sizes.lg}px` } : {}),
          ...(sizes?.xl ? { "--av-xl": `${sizes.xl}px` } : {}),
          background: side === "me" ? "var(--surface-2)" : "var(--surface-3)",
          border: `${ring}px solid ${ringColor}`,
          opacity: dim ? 0.6 : 1,
        } as React.CSSProperties
      }
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" className="h-full w-full rounded-full object-cover" />
      ) : memoji ? (
        <>
          {/* Memoji are transparent: sit on the circle, zoomed so the face fills it. */}
          <span className="absolute inset-0 overflow-hidden rounded-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarSrc(memoji)}
              alt=""
              draggable={false}
              className="h-full w-full object-contain"
              style={{ transform: avatarFrame(memoji) }}
            />
          </span>
          <span className="sr-only">{initial}</span>
        </>
      ) : (
        initial
      )}
      {children}
    </div>
  );
}

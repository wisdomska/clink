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
        "display relative flex flex-none items-center justify-center rounded-full",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: side === "me" ? "var(--surface-2)" : "var(--surface-3)",
        border: `${ring}px solid ${ringColor}`,
        fontSize: Math.round(size * 0.393),
        opacity: dim ? 0.6 : 1,
      }}
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

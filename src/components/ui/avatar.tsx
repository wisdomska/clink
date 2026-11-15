import { cn } from "./cn";
import { AVATAR_KEYS, avatarSrc, type AvatarKey } from "@/lib/avatars";

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
  ring = 2,
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
  const known = icon && (AVATAR_KEYS as readonly string[]).includes(icon);
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
      ) : known ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarSrc(icon!)}
            alt=""
            draggable={false}
            className="h-[78%] w-[78%] object-contain drop-shadow-[0_3px_6px_rgba(0,0,0,.35)]"
          />
          <span className="sr-only">{initial}</span>
        </>
      ) : (
        initial
      )}
      {children}
    </div>
  );
}

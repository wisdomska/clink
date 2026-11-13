import { Moon, Plant, Cat, Coffee, Sparkle } from "@phosphor-icons/react/dist/ssr";
import { cn } from "./cn";

const ICONS = { moon: Moon, plant: Plant, cat: Cat, coffee: Coffee, sparkle: Sparkle } as const;
export type AvatarIcon = keyof typeof ICONS;
export const AVATAR_ICONS = Object.keys(ICONS) as AvatarIcon[];

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
  const Icon = icon ? ICONS[icon] : null;
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
      ) : Icon && size >= 40 ? (
        <>
          <Icon aria-hidden size={Math.round(size * 0.5)} />
          <span className="sr-only">{initial}</span>
        </>
      ) : (
        initial
      )}
      {children}
    </div>
  );
}

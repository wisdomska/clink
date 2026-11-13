import type { ReactNode } from "react";
import { cn } from "./cn";

const scale = { 64: "text-[64px]", 48: "text-[48px]", 36: "text-[36px]", 28: "text-[28px]", 22: "text-[22px]" } as const;

/** Cabinet Grotesk 800, -2% tracking, 1.05 line height. Use <em> for emphasis. */
export function Display({
  as: Tag = "h1",
  size = 36,
  children,
  className,
  id,
}: {
  as?: "h1" | "h2" | "h3" | "div" | "p";
  size?: keyof typeof scale;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <Tag id={id} className={cn("display m-0 leading-[1.05] text-text", scale[size], className)}>
      {children}
    </Tag>
  );
}

export function Lead({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("m-0 text-base leading-normal text-muted text-pretty", className)}>{children}</p>;
}

/** Geist Mono 12 px label used for metadata. */
export function Mono({ children, className, as: Tag = "div" }: { children: ReactNode; className?: string; as?: "div" | "span" }) {
  return <Tag className={cn("mono text-xs text-faint", className)}>{children}</Tag>;
}

/** 18 px bold section label used above groups ("Date night kits"). */
export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn("m-0 text-lg font-bold text-text", className)}>{children}</h2>;
}

export function Card({ children, className, raised }: { children: ReactNode; className?: string; raised?: boolean }) {
  return (
    <div className={cn("flex flex-none flex-col rounded-card p-4", raised ? "bg-s2" : "border border-line bg-s1", className)}>
      {children}
    </div>
  );
}

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div aria-hidden className={cn("an-skel rounded-card bg-s2", className)} style={style} />;
}

/** Partner B square mark (never colour alone: A is a circle, B a square). */
export function PartnerMark({ who, size = 10 }: { who: "a" | "b"; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block flex-none"
      style={{
        width: size,
        height: size,
        background: who === "a" ? "var(--partner-a)" : "var(--partner-b)",
        borderRadius: who === "a" ? "50%" : 0,
      }}
    />
  );
}

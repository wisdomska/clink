import { BatteryHigh, CellSignalFull, WifiHigh } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/components/ui/cn";

/**
 * A device frame for live product previews. Purely illustrative, so it is
 * hidden from assistive tech: the copy next to it carries the meaning.
 */
export function Device({
  children,
  time = "21:14",
  className,
}: {
  children: React.ReactNode;
  time?: string;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "bg-app relative flex aspect-[300/620] w-[280px] flex-col overflow-hidden rounded-[44px] select-none sm:w-[300px]",
        className,
      )}
      style={{ boxShadow: "var(--shadow-device)" }}
    >
      <div className="text-text relative flex h-11 flex-none items-center justify-between px-7 pt-1.5 text-[13px]">
        <span className="mono">{time}</span>
        <span className="bg-page absolute top-2.5 left-1/2 h-[26px] w-[92px] -translate-x-1/2 rounded-full" />
        <span className="flex items-center gap-1">
          <CellSignalFull size={14} weight="fill" />
          <WifiHigh size={14} weight="bold" />
          <BatteryHigh size={16} weight="fill" />
        </span>
      </div>
      <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

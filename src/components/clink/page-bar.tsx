"use client";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react";
import { IconButton } from "@/components/ui/button";

/**
 * Every app screen's top bar: pinned while the page scrolls under it, with the
 * title at the same size as the Clink wordmark on Us (28 px). Optional Back
 * (a path, or a function) on the left and actions on the right.
 */
export function PageBar({
  title,
  back,
  actions,
}: {
  title: ReactNode;
  back?: string | (() => void);
  actions?: ReactNode;
}) {
  const router = useRouter();
  return (
    <div className="app-topbar flex min-h-11 flex-none items-center gap-3">
      {back && (
        <IconButton
          label="Back"
          onClick={() => (typeof back === "string" ? router.push(back) : back())}
        >
          <ArrowLeft size={20} />
        </IconButton>
      )}
      <h1 className="display m-0 min-w-0 flex-1 truncate text-[28px] leading-[1.15]">{title}</h1>
      {actions && <div className="flex flex-none items-center gap-2">{actions}</div>}
    </div>
  );
}

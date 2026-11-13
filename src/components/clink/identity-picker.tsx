"use client";

import { Wine, NotePencil, CloudSun } from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";
import type { Identity } from "@/lib/app-identity";

const ICONS = [
  { key: "clink", label: "Clink", Icon: Wine },
  { key: "notes", label: "Notes", Icon: NotePencil },
  { key: "weather", label: "Weather", Icon: CloudSun },
] as const;

/**
 * SET-02: the name and icon Clink shows on the home screen. Saved to the
 * profile and to a cookie the manifest reads, so it applies at install time.
 */
export function IdentityPicker({
  value,
  onChange,
  installed = true,
}: {
  value: Identity;
  onChange: (v: Identity) => void;
  /** After install the home screen icon only changes on reinstall, so say so. */
  installed?: boolean;
}) {
  return (
    <div className="flex gap-3" role="radiogroup" aria-label="App icon and name">
      {ICONS.map(({ key, label, Icon }) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={value === key}
          onClick={async () => {
            const prev = value;
            onChange(key);
            const r = await fetch("/api/me/settings", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ app_icon: key }),
            });
            if (!r.ok) {
              onChange(prev);
              return toast("Couldn't save that.");
            }
            if (installed)
              toast(
                key === "clink"
                  ? "Back to Clink."
                  : `Shows as ${label}. Reinstall from the browser to update the home screen.`,
              );
            else toast(`It will install as ${label}.`);
          }}
          className="press rounded-card bg-s1 text-text flex flex-1 cursor-pointer flex-col items-center gap-2 py-3"
          style={{ border: value === key ? "2px solid var(--accent)" : "1px solid var(--line)" }}
        >
          <span
            className="rounded-input flex h-[52px] w-[52px] items-center justify-center"
            style={{
              background: key === "clink" ? "var(--accent)" : "var(--surface-3)",
              color: key === "clink" ? "var(--on-accent)" : "var(--text)",
            }}
          >
            <Icon size={26} aria-hidden />
          </span>
          <span className="text-sm font-medium">{label}</span>
        </button>
      ))}
    </div>
  );
}

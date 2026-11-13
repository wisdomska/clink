"use client";
import { Backspace, Fingerprint } from "@phosphor-icons/react";

/** PIN pad from the prototype: 76 px round keys, Ember focus ring. */
export function PinPad({
  onKey,
  passkey,
  disabled,
}: {
  onKey: (k: string) => void;
  passkey?: () => void;
  disabled?: boolean;
}) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "pass", "0", "del"];
  return (
    <div className="grid grid-cols-[repeat(3,76px)] gap-x-[26px] gap-y-4">
      {keys.map((k) => (
        <button
          key={k}
          type="button"
          disabled={disabled || (k === "pass" && !passkey)}
          onClick={() => (k === "pass" ? passkey?.() : onKey(k))}
          aria-label={k === "del" ? "Delete" : k === "pass" ? "Use passkey" : k}
          className="mono border-line bg-s1 text-text active:bg-s3 flex h-[76px] w-[76px] cursor-pointer items-center justify-center rounded-full border text-[28px] transition-colors duration-200 disabled:cursor-default disabled:opacity-40"
          style={k === "pass" && !passkey ? { visibility: "hidden" } : undefined}
        >
          {k === "del" ? <Backspace size={26} /> : k === "pass" ? <Fingerprint size={26} /> : k}
        </button>
      ))}
    </div>
  );
}

export function PinDots({
  n,
  filled,
  wrong,
  shake,
}: {
  n: number;
  filled: number;
  wrong: boolean;
  shake: boolean;
}) {
  return (
    <div className={`my-6 mb-9 flex gap-[18px] ${shake ? "an-shake" : ""}`} aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          className="h-4 w-4 rounded-full border-[1.5px]"
          style={{
            borderColor: wrong ? "var(--danger)" : "var(--accent-dark)",
            background:
              i < filled ? (wrong ? "var(--danger)" : "var(--accent-dark)") : "transparent",
          }}
        />
      ))}
    </div>
  );
}

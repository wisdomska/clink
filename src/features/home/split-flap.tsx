"use client";
import { useEffect, useRef, useState } from "react";

/** One departure-board digit. Flips (rotateX) whenever its character changes. */
function Flap({ ch, size }: { ch: string; size: "lg" | "md" }) {
  const prev = useRef(ch);
  const [gen, setGen] = useState(0);
  useEffect(() => {
    if (prev.current !== ch) {
      prev.current = ch;
      setGen((g) => g + 1);
    }
  }, [ch]);
  const dims = size === "lg" ? "h-14 w-10 text-[32px]" : "h-[50px] w-9 text-[26px]";
  return (
    <div
      key={gen}
      className={`flap mono flex items-center justify-center rounded-flap border border-line ${dims} ${gen > 0 ? "an-flip-now" : ""}`}
      style={{ transformOrigin: "50% 50%" }}
    >
      {ch}
    </div>
  );
}

export function SplitFlap({ groups, size = "lg" }: { groups: Array<{ value: string; label: string }>; size?: "lg" | "md" }) {
  return (
    <div className="flex gap-3.5" style={{ perspective: 400 }} role="timer" aria-label={groups.map((g) => `${Number(g.value)} ${g.label.toLowerCase()}`).join(", ")}>
      {groups.map((g) => (
        <div key={g.label} className="flex flex-col gap-1.5" aria-hidden>
          <div className="flex gap-[3px]">
            {g.value.split("").map((c, i) => (
              <Flap key={i} ch={c} size={size} />
            ))}
          </div>
          <div className="mono text-xs text-faint">{g.label}</div>
        </div>
      ))}
    </div>
  );
}

export function EmptyBoard() {
  return (
    <div className="flex gap-[3px] opacity-50" aria-hidden>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="mono flex h-[50px] w-9 items-center justify-center rounded-flap border border-dashed border-line text-[26px] text-faint" style={{ marginRight: i === 1 || i === 3 ? 8 : 0 }}>
          -
        </div>
      ))}
    </div>
  );
}

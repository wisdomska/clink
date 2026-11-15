"use client";

/** Sealed envelope: flap, wax seal with both initials. */
export function SealedEnvelope({
  initials,
  tilt = 0,
  seal = 40,
}: {
  initials: string;
  tilt?: number;
  seal?: number;
}) {
  return (
    <div
      className="rounded-thumb border-line bg-s2 relative aspect-[3/2] w-full overflow-hidden border"
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      <div className="bg-s3 absolute inset-0" style={{ clipPath: "polygon(0 0,100% 0,50% 60%)" }} />
      <div
        className="display bg-accent text-on-accent absolute top-[60%] left-1/2 flex items-center justify-center rounded-full text-xs tracking-normal"
        style={{ width: seal, height: seal, margin: `${-seal / 2}px 0 0 ${-seal / 2}px` }}
      >
        {initials}
      </div>
    </div>
  );
}

/** Opened envelope with the letter peeking out. */
export function OpenedEnvelope({ tilt = 0 }: { tilt?: number }) {
  return (
    <div
      className="rounded-thumb border-line bg-s1 relative aspect-[3/2] w-full overflow-hidden border"
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      <div
        className="bg-s2 absolute inset-x-0 top-0 h-[60%]"
        style={{ clipPath: "polygon(0 100%,100% 100%,50% 0)" }}
      />
      <div className="bg-text absolute top-[24%] right-[14%] bottom-[12%] left-[14%] rounded opacity-90" />
    </div>
  );
}

/** Corked bottle with a paper tag. Size "lg" for the capsule page. */
export function Bottle({
  ready,
  tag,
  size = "md",
  corked = true,
  uncorking = false,
  tagTilt = -6,
}: {
  ready: boolean;
  tag: string;
  size?: "sm" | "md" | "lg";
  corked?: boolean;
  uncorking?: boolean;
  tagTilt?: number;
}) {
  const d = {
    sm: {
      cork: [18, 14],
      neck: [24, 30],
      body: [68, 96],
      radius: "26px 26px 16px 16px",
      paper: [32, 44],
      tag: [46, 30],
    },
    md: {
      cork: [22, 16],
      neck: [28, 36],
      body: [84, 120],
      radius: "30px 30px 18px 18px",
      paper: [40, 56],
      tag: [58, 42],
    },
    lg: {
      cork: [34, 26],
      neck: [44, 54],
      body: [150, 210],
      radius: "52px 52px 28px 28px",
      paper: [70, 100],
      tag: [0, 96],
    },
  }[size];
  const glass = ready ? "var(--accent)" : "var(--glass-line)";
  return (
    <div className="relative flex flex-col items-center">
      {corked ? (
        <span
          className={uncorking ? "an-cork" : ""}
          style={{
            width: d.cork[0],
            height: d.cork[1],
            borderRadius: size === "lg" ? "6px 6px 3px 3px" : "4px 4px 2px 2px",
            background: "var(--text-muted)",
          }}
        />
      ) : (
        <span style={{ width: d.cork[0], height: d.cork[1] }} />
      )}
      <span
        style={{
          width: d.neck[0],
          height: d.neck[1],
          border: "1.5px solid var(--glass-line)",
          borderBottom: "none",
          background: "var(--glass-fill)",
        }}
      />
      <span
        className="flex items-center justify-center"
        style={{
          width: d.body[0],
          height: d.body[1],
          borderRadius: d.radius,
          border: `1.5px solid ${glass}`,
          background: ready ? "var(--accent-wash)" : "var(--glass-fill)",
        }}
      >
        <span
          style={{
            width: d.paper[0],
            height: d.paper[1],
            background: "var(--text)",
            opacity: 0.75,
            borderRadius: 3,
            transform: `rotate(${tagTilt > 0 ? 6 : -8}deg)`,
          }}
        />
      </span>
      <span
        className="mono absolute rounded-[3px] px-2 py-1 text-[11px] whitespace-nowrap"
        style={{
          left: size === "lg" ? "calc(50% + 34px)" : d.tag[0],
          top: d.tag[1],
          background: ready ? "var(--accent)" : "var(--text)",
          color: "var(--on-accent)",
          transform: `rotate(${tagTilt}deg)`,
          fontSize: size === "lg" ? 12 : 11,
          padding: size === "lg" ? "6px 10px" : "4px 8px",
        }}
      >
        {tag}
      </span>
    </div>
  );
}

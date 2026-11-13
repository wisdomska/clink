/** 8 spark particles radiating from a point (prototype: rotate 0..315 step 45). */
export function Sparks({
  variant = "spark",
  length = 10,
  className,
}: {
  variant?: "spark" | "spark-late" | "spark-btn";
  length?: number;
  className?: string;
}) {
  const anim = variant === "spark" ? "an-spark" : variant === "spark-late" ? "an-spark-late" : "an-spark-btn";
  return (
    <div aria-hidden className={className} style={{ position: "absolute", width: 0, height: 0 }}>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <div key={a} style={{ position: "absolute", left: 0, top: 0, transform: `rotate(${a}deg)` }}>
          <div
            className={anim}
            style={{
              width: 4,
              height: length,
              margin: `${-length / 2}px 0 0 -2px`,
              borderRadius: 2,
              background: "var(--accent)",
            }}
          />
        </div>
      ))}
    </div>
  );
}

/** Small object renders used on the landing story: matchbook, stub, envelope, board. */

export function MiniMatchbook() {
  return (
    <div className="relative h-[132px] w-[100px] overflow-hidden rounded-thumb border border-line bg-s3" style={{ transform: "rotate(-4deg)" }}>
      <div className="display absolute top-3.5 left-3 text-[22px] leading-none">
        dare
        <br />
        no. 7
      </div>
      <div className="mono absolute bottom-[30px] left-3 text-xs text-muted">strike</div>
      <div
        className="absolute inset-x-0 bottom-0 h-[22px] border-t border-line"
        style={{ background: "repeating-linear-gradient(90deg,#4A4450 0 2px,#211E25 2px 5px)" }}
      />
    </div>
  );
}

export function MiniStub({ when = "SAT 21:00", title = "Stargazing" }: { when?: string; title?: string }) {
  return (
    <div className="flex h-[84px] w-[156px] overflow-hidden rounded-thumb" style={{ transform: "rotate(3deg)" }}>
      <div className="flex flex-1 flex-col justify-between bg-s2 px-3 py-2.5">
        <span className="mono text-xs text-muted">{when}</span>
        <span className="display text-lg tracking-normal">{title}</span>
      </div>
      <div className="w-0 border-l-2 border-dashed border-app" />
      <div
        className="mono flex w-[34px] items-center justify-center bg-accent text-xs tracking-[.1em] text-on-accent"
        style={{ writingMode: "vertical-rl" }}
      >
        ADMIT 2
      </div>
    </div>
  );
}

export function MiniEnvelope({ initials = "N&T" }: { initials?: string }) {
  return (
    <div className="relative h-[100px] w-[150px] overflow-hidden rounded-thumb border border-line bg-s2" style={{ transform: "rotate(-2deg)" }}>
      <div className="absolute inset-0 bg-s3" style={{ clipPath: "polygon(0 0,100% 0,50% 60%)" }} />
      <div className="display absolute top-[60%] left-1/2 -mt-[19px] -ml-[19px] flex h-[38px] w-[38px] items-center justify-center rounded-full bg-accent text-xs tracking-normal text-on-accent">
        {initials}
      </div>
    </div>
  );
}

export function MiniBoard({ chars = "081432" }: { chars?: string }) {
  return (
    <div className="flex items-end gap-1" aria-label="08 days 14 hours 32 minutes">
      {chars.split("").map((ch, i) => (
        <div
          key={i}
          className="flap mono flex h-12 w-[34px] items-center justify-center rounded-flap border border-line text-[26px]"
          style={{ marginRight: i === 1 || i === 3 ? 8 : 0 }}
        >
          {ch}
        </div>
      ))}
    </div>
  );
}

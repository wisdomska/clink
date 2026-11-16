/**
 * Shown the instant you tap into After Dark, while the screen loads. Links
 * prefetch the After Dark shell up to here, so the tap never feels dead.
 */
export default function Loading() {
  return (
    <div className="screen" role="status" aria-label="Opening After Dark">
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-4">
        <div className="flex h-11 items-center justify-between">
          <div className="an-skel bg-s2 h-11 w-11 rounded-full" />
          <div className="an-skel bg-s2 h-11 w-11 rounded-full" />
        </div>
        <div className="an-skel bg-s2 mt-2 h-10 w-48 rounded-full" />
        <div className="an-skel rounded-card bg-s2 h-40" />
        <div className="grid grid-cols-2 gap-3">
          <div className="an-skel rounded-card bg-s2 h-28" />
          <div className="an-skel rounded-card bg-s2 h-28" />
        </div>
        <div className="an-skel rounded-card bg-s2 h-24" />
      </div>
    </div>
  );
}

/**
 * Shown while a tab's screen loads. Pure CSS (works before any JavaScript).
 * Shaped like the tab screens it stands in for: a 44 px title row, then cards
 * in one column on phones and two from 1024 px, so nothing jumps when the real
 * screen swaps in. Fades in after 90 ms (see .an-skel): prefetched tabs swap in
 * before then and never flash it, slow ones show it straight away.
 */
export default function Loading() {
  return (
    <div className="screen" role="status" aria-label="Loading">
      <div className="flex h-11 items-center justify-between lg:h-[50px]">
        <div className="an-skel bg-s2 h-8 w-32 rounded-full lg:h-11 lg:w-48" />
        <div className="flex gap-2 lg:hidden">
          <div className="an-skel bg-s2 h-11 w-11 rounded-full" />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 lg:mt-8 lg:grid-cols-2 lg:gap-8">
        <div className="flex flex-col gap-4">
          <div className="an-skel rounded-card bg-s2 h-44" />
          <div className="an-skel rounded-card bg-s2 h-24" />
        </div>
        <div className="flex flex-col gap-4">
          <div className="an-skel rounded-card bg-s2 h-40" />
          <div className="an-skel rounded-card bg-s2 h-28" />
        </div>
      </div>
    </div>
  );
}

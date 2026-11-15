/**
 * Shown while a tab's screen loads. Pure CSS (works before any JavaScript),
 * and it only fades in after 200 ms so fast navigations never flash it.
 */
export default function Loading() {
  return (
    <div className="screen flex flex-col gap-4" role="status" aria-label="Loading">
      <div className="an-skel rounded-card bg-s2 h-12 w-2/3" />
      <div className="an-skel rounded-card bg-s2 h-40" />
      <div className="grid grid-cols-2 gap-3">
        <div className="an-skel rounded-card bg-s2 h-28" />
        <div className="an-skel rounded-card bg-s2 h-28" />
      </div>
      <div className="an-skel rounded-card bg-s2 h-24" />
    </div>
  );
}

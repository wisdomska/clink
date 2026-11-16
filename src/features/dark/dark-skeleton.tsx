import { Moon } from "@phosphor-icons/react/dist/ssr";

/**
 * Shown the instant After Dark is opened, while the private checks (account,
 * couple, PIN session) run on the server. Shaped like the hub, in Ember, so the
 * screen is never blank and it's obvious something is opening.
 */
export function DarkSkeleton() {
  return (
    <div data-mode="dark" className="bg-app min-h-dvh">
      <main
        role="status"
        aria-label="Opening After Dark"
        className="mx-auto flex w-full max-w-[1100px] flex-col gap-5 px-4 pt-[calc(env(safe-area-inset-top)+4px)] pb-10 md:px-8 md:pt-8"
      >
        <div className="flex h-11 items-center justify-between">
          <div className="text-ember flex items-center gap-1.5 text-xs font-medium">
            <Moon size={16} aria-hidden />
            Opening After Dark
          </div>
          <div className="an-skel bg-s2 h-9 w-20 rounded-full" />
        </div>
        <div className="an-skel bg-s2 h-10 w-56 rounded-full" />
        <div className="grid gap-3 md:grid-cols-2">
          <div className="an-skel rounded-card bg-s2 h-36" />
          <div className="an-skel rounded-card bg-s2 h-36" />
          <div className="an-skel rounded-card bg-s2 h-36" />
          <div className="an-skel rounded-card bg-s2 h-36" />
        </div>
        <div className="an-skel rounded-card bg-s2 h-24" />
      </main>
    </div>
  );
}

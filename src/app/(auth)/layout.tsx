import { AuthHero, AuthGlow } from "@/components/clink/auth-hero";

/** Auth, onboarding, link and install: one column on phones, an animated art panel beside it from 1024 px. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-app relative isolate min-h-dvh overflow-hidden lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <AuthGlow />
      <aside aria-hidden className="relative hidden items-center p-10 lg:flex">
        <div className="relative w-full">
          <div className="origin-bottom scale-[1.6]">
            <AuthHero mode="signup" />
          </div>
          <p className="display mt-24 text-center text-[40px] leading-[1.05]">
            Do things <em>together</em>, from apart.
          </p>
          <p className="text-muted mx-auto mt-3 max-w-[38ch] text-center text-base">
            Clinks, calls, games, letters and a little After Dark. Built for two.
          </p>
        </div>
      </aside>
      <main className="relative mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-5 pt-[calc(env(safe-area-inset-top)+12px)] pb-[calc(env(safe-area-inset-bottom)+32px)] lg:justify-center lg:py-12">
        {children}
      </main>
    </div>
  );
}

import { HeroGlasses } from "@/components/clink/hero-glasses";

/** Auth, onboarding, link and install: one column on phones, art panel beside it from 1024 px. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-app min-h-dvh lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <aside aria-hidden className="lg:bg-page hidden items-center p-10 lg:flex">
        <div className="w-full">
          <HeroGlasses />
          <p className="display mt-8 text-[36px] leading-[1.05]">
            Do things <em>together</em>, from apart.
          </p>
        </div>
      </aside>
      <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-5 pt-[calc(env(safe-area-inset-top)+12px)] pb-[calc(env(safe-area-inset-bottom)+32px)] lg:justify-center lg:py-12">
        {children}
      </main>
    </div>
  );
}

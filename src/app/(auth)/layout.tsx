import { AuthPoster } from "@/components/clink/auth-poster";
import { MotionRoot } from "@/components/clink/motion-root";

/** Auth, onboarding, link and install: one column on phones, the brand poster beside it from 1024 px. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <MotionRoot>
      <div className="bg-app relative isolate min-h-dvh overflow-hidden lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)]">
        <aside className="relative hidden p-3 lg:block">
          <div className="sticky top-3 h-[calc(100dvh-24px)]">
            <AuthPoster />
          </div>
        </aside>
        <main className="relative mx-auto flex min-h-dvh w-full max-w-[460px] flex-col px-5 pt-[calc(env(safe-area-inset-top)+12px)] pb-[calc(env(safe-area-inset-bottom)+32px)] lg:justify-center lg:px-8 lg:py-12">
          {children}
        </main>
      </div>
    </MotionRoot>
  );
}

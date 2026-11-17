import { WifiSlash } from "@phosphor-icons/react/dist/ssr";
import { Display } from "@/components/ui/heading";

export const metadata = { title: "Offline" };

export default function Offline() {
  return (
    <main className="an-screen mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center gap-4 px-5">
      <WifiSlash size={44} className="text-warning" aria-hidden />
      <Display>
        You&apos;re <em>offline</em>.
      </Display>
      <p className="text-muted m-0 text-base leading-normal">
        Anything you send waits here and goes out when you&apos;re back. Private things never load
        offline.
      </p>
    </main>
  );
}

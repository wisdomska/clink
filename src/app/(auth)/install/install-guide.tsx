"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle, DotsThreeVertical, Export, PlusSquare, BellRinging, DownloadSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Display, Lead } from "@/components/ui/heading";
import { Segmented } from "@/components/ui/segmented";
import { isStandalone, platform, enablePush } from "@/lib/pwa";
import { toast } from "@/components/ui/toast";

type Tab = "android" | "iphone" | "done";
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const STEPS: Record<"android" | "iphone", Array<[string, string]>> = {
  android: [
    ["1", "Tap the three dots in Chrome"],
    ["2", "Choose Install app"],
    ["3", "Open Clink and allow notifications"],
  ],
  iphone: [
    ["1", "Open this page in Safari"],
    ["2", "Tap Share, then Add to Home Screen"],
    ["3", "Open Clink from your home screen and allow notifications"],
  ],
};

export function InstallGuide() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("android");
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [push, setPush] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    setTab(isStandalone() ? "done" : platform() === "ios" ? "iphone" : "android");
    if ("Notification" in window) setPush(Notification.permission);
    else setPush("unsupported");
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setTab("done");
      void fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "pwa_installed", props: { platform: platform() } }) }).catch(() => undefined);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const steps = tab === "done" ? [] : STEPS[tab];
  const Shot = tab === "iphone" ? Export : DotsThreeVertical;

  return (
    <div className="an-screen flex flex-1 flex-col">
      <Display size={36} className="mt-4">
        Put Clink on your <em>home screen</em>
      </Display>
      <Lead className="mt-2 mb-5">So Clinks arrive like texts. Takes 20 seconds.</Lead>
      <Segmented
        label="Your device"
        value={tab}
        onChange={setTab}
        options={[
          { value: "android", label: "Android" },
          { value: "iphone", label: "iPhone" },
          { value: "done", label: "Installed" },
        ]}
      />
      {tab !== "done" ? (
        <div key={tab} className="an-reveal">
          <div className="stripe-dim mt-5 flex h-[180px] flex-none flex-col items-center justify-center gap-3 rounded-card border border-line text-faint">
            <div className="flex items-center gap-3 text-text">
              <Shot size={40} aria-hidden />
              <ArrowRight size={20} className="text-faint" aria-hidden />
              {tab === "iphone" ? <PlusSquare size={40} aria-hidden /> : <DownloadSimple size={40} aria-hidden />}
            </div>
            <span className="mono text-xs">{tab === "iphone" ? "SHARE, THEN ADD TO HOME SCREEN" : "MENU, THEN INSTALL APP"}</span>
          </div>
          <ol className="m-0 mt-5 flex list-none flex-col gap-3.5 p-0">
            {steps.map(([n, t]) => (
              <li key={n} className="flex items-center gap-3">
                <span className="mono flex h-9 w-9 flex-none items-center justify-center rounded-full border border-line bg-s1 text-sm text-accent">{n}</span>
                <span className="text-base leading-[1.4]">{t}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 mb-0 text-sm leading-normal text-faint">
            {tab === "iphone" ? "Needs iOS 16.4 or later for notifications." : "Works in Chrome, Edge and Samsung Internet."}
          </p>
          {prompt && tab === "android" && (
            <Button
              variant="secondary"
              size="lg"
              className="mt-4"
              onClick={async () => {
                await prompt.prompt();
                const { outcome } = await prompt.userChoice;
                if (outcome === "accepted") setTab("done");
                setPrompt(null);
              }}
            >
              <DownloadSimple size={20} aria-hidden />
              Install now
            </Button>
          )}
        </div>
      ) : (
        <div className="an-reveal flex flex-1 flex-col justify-center gap-3">
          <CheckCircle size={56} className="text-accent" aria-hidden />
          <div className="display text-[28px] leading-[1.05]">Already on your home screen.</div>
          {push === "granted" ? (
            <Lead>Notifications are on. Clinks will find you.</Lead>
          ) : (
            <>
              <Lead>One more thing: let Clinks find you.</Lead>
              <Button
                variant="secondary"
                size="lg"
                className="self-start"
                onClick={async () => {
                  const r = await enablePush();
                  if (r === "granted") setPush("granted");
                  else toast(r === "unsupported" ? "This browser can't do notifications yet." : "Notifications stay off. You can change that in Settings.");
                }}
              >
                <BellRinging size={20} aria-hidden />
                Turn on notifications
              </Button>
            </>
          )}
        </div>
      )}
      <div className="min-h-5 flex-1" />
      <Button className="flex-none" onClick={() => router.push("/us")}>
        Done
      </Button>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle,
  DotsThreeVertical,
  Export,
  PlusSquare,
  BellRinging,
  DownloadSimple,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Display, Lead } from "@/components/ui/heading";
import { Segmented } from "@/components/ui/segmented";
import { isStandalone, platform, enablePush } from "@/lib/pwa";
import { useInstallState, promptInstall } from "@/lib/install";
import { useClientValue } from "@/lib/hooks";
import { toast } from "@/components/ui/toast";
import { IdentityPicker } from "@/components/clink/identity-picker";
import type { Identity } from "@/lib/app-identity";

type Tab = "android" | "iphone" | "done";

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

export function InstallGuide({ identity = "clink" }: { identity?: Identity }) {
  const router = useRouter();
  const detected = useClientValue<Tab>(
    () => (isStandalone() ? "done" : platform() === "ios" ? "iphone" : "android"),
    "android",
  );
  const [picked, setTab] = useState<Tab | null>(null);
  const [icon, setIcon] = useState<Identity>(identity);
  const tab = picked ?? detected;
  const installState = useInstallState();
  const initialPush = useClientValue<NotificationPermission | "unsupported">(
    () => ("Notification" in window ? Notification.permission : "unsupported"),
    "default",
  );
  const [pushOverride, setPush] = useState<NotificationPermission | "unsupported" | null>(null);
  const push = pushOverride ?? initialPush;

  useEffect(() => {
    const onInstalled = () => {
      setTab("done");
      void fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "pwa_installed", props: { platform: platform() } }),
      }).catch(() => undefined);
    };
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const steps = tab === "done" ? [] : STEPS[tab];
  const Shot = tab === "iphone" ? Export : DotsThreeVertical;

  return (
    <div className="an-screen flex flex-1 flex-col">
      <Display size={36} className="mt-4">
        Put Clink on your home screen
      </Display>
      <Lead className="mt-2 mb-5">So Clinks arrive like texts. Takes 20 seconds.</Lead>
      {tab !== "done" && (
        <section aria-labelledby="looks" className="mb-5">
          <h2 id="looks" className="m-0 mb-1 text-base font-bold">
            How it shows on your device
          </h2>
          <p className="text-muted m-0 mb-3 text-sm">
            Pick a quieter name and icon if you like. Notifications stay generic either way.
          </p>
          <IdentityPicker value={icon} onChange={setIcon} installed={false} />
        </section>
      )}
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
          <div className="rounded-card border-line bg-s1 text-muted mt-5 flex h-[180px] flex-none flex-col items-center justify-center gap-3 border">
            <div className="text-text flex items-center gap-3">
              <Shot size={40} aria-hidden />
              <ArrowRight size={20} className="text-faint" aria-hidden />
              {tab === "iphone" ? (
                <PlusSquare size={40} aria-hidden />
              ) : (
                <DownloadSimple size={40} aria-hidden />
              )}
            </div>
            <span className="text-sm">
              {tab === "iphone" ? "Share, then Add to Home Screen" : "Menu, then Install app"}
            </span>
          </div>
          <ol className="m-0 mt-5 flex list-none flex-col gap-3.5 p-0">
            {steps.map(([n, t]) => (
              <li key={n} className="flex items-center gap-3">
                <span className="mono border-line bg-s1 text-text flex h-8 w-8 flex-none items-center justify-center rounded-full border text-sm">
                  {n}
                </span>
                <span className="text-base leading-[1.4]">{t}</span>
              </li>
            ))}
          </ol>
          <p className="text-faint mt-4 mb-0 text-sm leading-normal">
            {tab === "iphone"
              ? "Needs iOS 16.4 or later for notifications."
              : "Works in Chrome, Edge and Samsung Internet."}
          </p>
          {installState === "prompt" && tab === "android" && (
            <Button
              variant="secondary"
              size="lg"
              className="mt-4"
              onClick={async () => {
                if (await promptInstall()) setTab("done");
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
                  else
                    toast(
                      r === "unsupported"
                        ? "This browser can't do notifications yet."
                        : "Notifications stay off. You can change that in Settings.",
                    );
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

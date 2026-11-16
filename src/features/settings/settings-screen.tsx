"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CaretRight,
  Trash,
  ChatCircle,
  BellSimple,
  BellRinging,
} from "@phosphor-icons/react";
import { useCouple } from "@/features/couple/context";
import { Button, IconButton } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Sheet } from "@/components/ui/sheet";
import { Input, Label } from "@/components/ui/field";
import { Display } from "@/components/ui/heading";
import { toast } from "@/components/ui/toast";
import { cn } from "@/components/ui/cn";
import { enablePush } from "@/lib/pwa";
import { PasskeyRows } from "./passkeys";
import { AccountRows } from "./accounts";
import { RitualTimeRows } from "./ritual-time";
import { PrivacyCard } from "./privacy";
import { FeelCard } from "./feel";
import { NavTabs, TabPanel, useTab } from "@/components/ui/nav-tabs";
import { AppearanceCard } from "./appearance";
import { IdentityPicker } from "@/components/clink/identity-picker";
import { InstallCard } from "./install-card";
import { asIdentity } from "@/lib/app-identity";
import { ProfileCard } from "./profile";

async function patchSettings(body: Record<string, unknown>) {
  const r = await fetch("/api/me/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error((await r.json()).message ?? "Couldn't save that.");
}

function Row({
  children,
  last,
  danger,
  onClick,
  href,
}: {
  children: React.ReactNode;
  last?: boolean;
  danger?: boolean;
  onClick?: () => void;
  href?: string;
}) {
  const cls = cn(
    "press flex min-h-14 w-full items-center justify-between gap-3 bg-transparent px-4 py-2.5 text-left text-base font-medium",
    !last && "border-b border-line",
    danger ? "text-danger hover:text-danger" : "text-text hover:text-text",
    (onClick || href) && "cursor-pointer",
  );
  if (href)
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={cls}>
        {children}
      </button>
    );
  return <div className={cls}>{children}</div>;
}

const SETTINGS_TABS = [
  { value: "profile", label: "Profile" },
  { value: "look", label: "Look and feel" },
  { value: "alerts", label: "Notifications" },
  { value: "privacy", label: "Privacy" },
  { value: "account", label: "Account" },
] as const;

export function SettingsScreen({ darkSetUp, myTiers }: { darkSetUp: boolean; myTiers: string[] }) {
  const router = useRouter();
  const ctx = useCouple();
  const { me, partner, settings } = ctx;
  const [notify, setNotify] = useState<Record<string, boolean>>({
    clinks: true,
    chat: true,
    games: true,
    dates: true,
    keepsakes: true,
    dark: false,
    detailed: false,
    ...settings.notify,
  });
  const [quiet, setQuiet] = useState({ start: settings.quietStart, end: settings.quietEnd });
  const [quietSaved, setQuietSaved] = useState(quiet);
  const [icon, setIcon] = useState(asIdentity(settings.appIcon));
  const [discreet, setDiscreet] = useState(ctx.discreet);
  const [saved, setSaved] = useState(settings.allowSavedSpicyMine);
  const [savedBoth, setSavedBoth] = useState(settings.allowSavedSpicyBoth);
  const [unlink, setUnlink] = useState<0 | 1 | 2>(0);
  const [unlinkToken, setUnlinkToken] = useState<string | null>(null);
  const [del, setDel] = useState(false);
  const [delText, setDelText] = useState("");
  const [quietOpen, setQuietOpen] = useState(false);
  const [startedOn, setStartedOn] = useState(ctx.startedOn ?? "");
  const [busy, setBusy] = useState(false);
  const tab = useTab(SETTINGS_TABS);

  async function tog(k: string, v: boolean) {
    const prev = notify[k];
    setNotify((n) => ({ ...n, [k]: v }));
    try {
      await patchSettings({ notify: { [k]: v } });
    } catch {
      setNotify((n) => ({ ...n, [k]: prev ?? false }));
      toast.err("Couldn't save that.");
    }
  }

  const since = new Date(ctx.linkedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="screen an-screen">
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4">
        <div className="app-topbar flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <IconButton label="Back" onClick={() => router.push("/us")}>
              <ArrowLeft size={20} />
            </IconButton>
            <Display size={36}>Settings</Display>
          </div>
          <NavTabs label="Settings sections" tabs={SETTINGS_TABS} />
        </div>

        {tab === "profile" && (
          <TabPanel key="profile">
            <ProfileCard />
          </TabPanel>
        )}

        {tab === "look" && (
          <TabPanel key="look" className="flex flex-col gap-4">
            <AppearanceCard />
            <FeelCard />
            <InstallCard />
            <h2 className="m-0 mt-1 text-lg font-bold">App icon and name</h2>
            <IdentityPicker value={icon} onChange={setIcon} />
          </TabPanel>
        )}

        {tab === "alerts" && (
          <TabPanel key="alerts" className="flex flex-col gap-4">
            <h2 className="sr-only">Notifications</h2>
            <div className="rounded-card border-line bg-s1 overflow-hidden border">
              <Toggle
                label="Clinks"
                checked={notify.clinks !== false}
                onChange={(v) => tog("clinks", v)}
              />
              <Toggle
                label="Chat"
                checked={notify.chat !== false}
                onChange={(v) => tog("chat", v)}
              />
              <Toggle
                label="Games"
                sub="Your turn and invites"
                checked={notify.games !== false}
                onChange={(v) => tog("games", v)}
              />
              <Toggle
                label="Dates"
                sub="1 day and 1 hour before"
                checked={notify.dates !== false}
                onChange={(v) => tog("dates", v)}
              />
              <Toggle
                label="Keepsakes"
                sub="Letters opened, capsules ready"
                checked={notify.keepsakes !== false}
                onChange={(v) => tog("keepsakes", v)}
              />
              <Toggle
                label="After Dark"
                sub='Says only "New moment in Clink", so your lock screen gives nothing away'
                checked={notify.dark === true}
                onChange={(v) => tog("dark", v)}
              />
              <Toggle
                label="Show message text"
                sub='Off: "New moment in Clink". Never for After Dark.'
                checked={notify.detailed === true}
                onChange={(v) => tog("detailed", v)}
              />
              <Row onClick={() => setQuietOpen(true)}>
                <span>Quiet hours</span>
                <span className="mono text-muted text-sm">
                  {quietSaved.start} to {quietSaved.end}
                </span>
              </Row>
              <Row
                last
                onClick={async () => {
                  const r = await enablePush();
                  toast(
                    r === "granted"
                      ? "This device gets notifications."
                      : r === "unsupported"
                        ? "Install Clink first, then turn these on."
                        : "Notifications are blocked in your browser settings.",
                  );
                }}
              >
                <span className="flex items-center gap-2">
                  <BellRinging size={18} aria-hidden /> Notifications on this device
                </span>
                <CaretRight size={18} className="text-faint" aria-hidden />
              </Row>
            </div>
          </TabPanel>
        )}

        {tab === "privacy" && (
          <TabPanel key="privacy" className="flex flex-col gap-4">
            <PrivacyCard />
            <h2 className="m-0 mt-1 text-lg font-bold">After Dark</h2>
            <div className="rounded-card border-line bg-s1 overflow-hidden border">
              {darkSetUp ? (
                <>
                  <Toggle
                    label="Allow saved spicy media"
                    sub={
                      savedBoth
                        ? "On for both of you"
                        : saved
                          ? `On for you. Waiting on ${partner.name}.`
                          : "You both need this on"
                    }
                    checked={saved}
                    onChange={async (v) => {
                      const prev = saved;
                      setSaved(v);
                      if (!v) setSavedBoth(false);
                      try {
                        const r = await fetch("/api/couple/allow-saved", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ allow: v }),
                        });
                        if (!r.ok) throw new Error();
                        const d = await r.json();
                        setSavedBoth(Boolean(d.both));
                      } catch {
                        setSaved(prev);
                        toast.err("Couldn't save that.");
                      }
                    }}
                  />
                  <Row href="/dark/consent" last>
                    <span>Your tiers</span>
                    <span className="text-muted text-sm font-normal">
                      {myTiers.length ? myTiers.join(", ") : "None yet"}
                    </span>
                  </Row>
                </>
              ) : (
                <Row href="/dark/setup" last>
                  <span>
                    Set up After Dark
                    <span className="text-faint block text-[13px] font-normal">
                      18+, private, opens only when you both say yes.
                    </span>
                  </span>
                  <CaretRight size={18} className="text-faint" aria-hidden />
                </Row>
              )}
            </div>
          </TabPanel>
        )}

        {tab === "account" && (
          <TabPanel key="account" className="flex flex-col gap-4">
            <h2 className="m-0 mt-1 text-lg font-bold">Linking and account</h2>
            <div className="rounded-card border-line bg-s1 overflow-hidden border">
              <Row>
                <span>Linked with {partner.name}</span>
                <span className="text-muted text-sm font-normal">Since {since}</span>
              </Row>
              <div className="border-line flex min-h-14 items-center justify-between gap-3 border-b px-4 py-2.5">
                <label htmlFor="started" className="text-base font-medium">
                  Together since
                </label>
                <input
                  id="started"
                  type="date"
                  value={startedOn}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={async (e) => {
                    const prev = startedOn;
                    const next = e.target.value;
                    setStartedOn(next);
                    const r = await fetch("/api/couple", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ started_on: next || null }),
                    }).catch(() => null);
                    if (r?.ok) toast("Saved. It's on your timeline.");
                    else {
                      setStartedOn(prev);
                      toast.err("Couldn't save that date.");
                    }
                  }}
                  className="mono rounded-input border-line bg-s2 text-text h-10 border px-3 text-sm"
                />
              </div>
              <RitualTimeRows />
              <AccountRows />
              <PasskeyRows />
              <Row href="/help">
                Help and safety
                <CaretRight size={18} className="text-faint" aria-hidden />
              </Row>
              <Row
                onClick={async () => {
                  setBusy(true);
                  const r = await fetch("/api/me/export", { method: "POST" });
                  const d = await r.json();
                  setBusy(false);
                  if (!r.ok) return toast.err(d.message ?? "Couldn't build your export.");
                  window.location.href = d.url;
                  toast("Your export is ready. The link works for 48 h.");
                }}
              >
                {busy ? "Packing your data" : "Download my data"}
                <CaretRight size={18} className="text-faint" aria-hidden />
              </Row>
              <Row
                onClick={async () => {
                  await fetch("/api/auth/signout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ everywhere: false }),
                  });
                  window.location.href = "/";
                }}
              >
                Sign out
              </Row>
              <Row
                onClick={async () => {
                  await fetch("/api/auth/signout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ everywhere: true }),
                  });
                  window.location.href = "/login";
                }}
              >
                Sign out of all devices
              </Row>
              <Row danger onClick={() => setUnlink(1)}>
                Unlink from {partner.name}
              </Row>
              <Row danger last onClick={() => setDel(true)}>
                Delete my account
              </Row>
            </div>
          </TabPanel>
        )}

        <Sheet
          open={unlink > 0}
          onOpenChange={(v) => !v && setUnlink(0)}
          title={`Unlink from ${partner.name}`}
          handle
        >
          {unlink === 1 ? (
            <>
              <div className="mono text-faint text-xs">Step 1 of 2</div>
              <div className="display text-[28px] leading-[1.05]">Unlink from {partner.name}?</div>
              <div className="flex flex-col gap-2.5 text-base leading-[1.45]">
                <div className="flex gap-2.5">
                  <Trash size={20} className="text-danger flex-none" aria-hidden />
                  Vault and View once media deleted for both of you within 1 hour.
                </div>
                <div className="flex gap-2.5">
                  <ChatCircle size={20} className="text-muted flex-none" aria-hidden />
                  Chat becomes read-only for 30 days, then it&apos;s deleted.
                </div>
                <div className="flex gap-2.5">
                  <BellSimple size={20} className="text-muted flex-none" aria-hidden />
                  {partner.name} gets a short, neutral notice.
                </div>
              </div>
              <Button
                variant="danger-outline"
                size="lg"
                onClick={async () => {
                  const r = await fetch("/api/couple/unlink", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ step: "start" }),
                  });
                  setUnlinkToken((await r.json()).token);
                  setUnlink(2);
                }}
              >
                Continue
              </Button>
              <Button variant="secondary" size="lg" onClick={() => setUnlink(0)}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <div className="mono text-faint text-xs">Step 2 of 2</div>
              <div className="display text-[28px] leading-[1.05]">
                Last check. This can&apos;t be undone.
              </div>
              <p className="text-muted m-0 text-base leading-normal">
                You&apos;ll both go back to the link screen.
              </p>
              <Button
                variant="danger"
                size="lg"
                loading={busy}
                onClick={async () => {
                  setBusy(true);
                  const r = await fetch("/api/couple/unlink", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ step: "confirm", token: unlinkToken }),
                  });
                  setBusy(false);
                  if (!r.ok) return toast.err((await r.json()).message ?? "Couldn't unlink.");
                  toast("Unlinked. Wipe finishes within 1 hour.");
                  window.location.href = "/link";
                }}
              >
                Yes, unlink and wipe
              </Button>
              <Button variant="secondary" size="lg" onClick={() => setUnlink(0)}>
                Keep us linked
              </Button>
            </>
          )}
        </Sheet>

        <Sheet open={del} onOpenChange={setDel} title="Delete your account" handle>
          <div className="display text-[28px] leading-[1.05]">Delete your account?</div>
          <p className="text-muted m-0 text-base leading-normal">
            You&apos;re unlinked from {partner.name} straight away and every private item is wiped
            within 1 hour. Everything else you made, including what {partner.name} can see, is
            deleted within 30 days.
          </p>
          <div>
            <Label htmlFor="del">Type DELETE to confirm</Label>
            <Input
              id="del"
              value={delText}
              onChange={(e) => setDelText(e.target.value)}
              autoCapitalize="characters"
            />
          </div>
          <Button
            variant="danger"
            size="lg"
            disabled={delText !== "DELETE" || busy}
            onClick={async () => {
              setBusy(true);
              const r = await fetch("/api/me/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ confirm: "DELETE" }),
              });
              setBusy(false);
              if (!r.ok) return toast.err((await r.json()).message ?? "Couldn't delete.");
              window.location.href = "/";
            }}
          >
            Delete everything
          </Button>
        </Sheet>

        <Sheet
          open={quietOpen}
          onOpenChange={(v) => {
            if (!v) setQuiet(quietSaved);
            setQuietOpen(v);
          }}
          title="Quiet hours"
          handle
        >
          <div className="display text-[28px]">Quiet hours</div>
          <p className="text-muted m-0 text-sm">
            In your time zone ({me.timezone}). Clinks still arrive, silently.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="qs">From</Label>
              <Input
                id="qs"
                type="time"
                value={quiet.start}
                onChange={(e) => setQuiet((q) => ({ ...q, start: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="qe">To</Label>
              <Input
                id="qe"
                type="time"
                value={quiet.end}
                onChange={(e) => setQuiet((q) => ({ ...q, end: e.target.value }))}
              />
            </div>
          </div>
          <Button
            onClick={async () => {
              // Optimistic: close and confirm now, roll back if the save fails.
              const prev = quietSaved;
              const next = quiet;
              setQuietSaved(next);
              setQuietOpen(false);
              toast("Quiet hours saved.");
              try {
                await patchSettings({ quiet_start: next.start, quiet_end: next.end });
              } catch {
                setQuietSaved(prev);
                setQuiet(prev);
                toast.err("Couldn't save quiet hours.");
              }
            }}
          >
            Save
          </Button>
        </Sheet>
      </div>
    </div>
  );
}

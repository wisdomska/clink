"use client";
import { useState } from "react";
import Link from "next/link";
import { CaretRight, Trash, ChatCircle, BellSimple, BellRinging } from "@phosphor-icons/react";
import { useCouple } from "@/features/couple/context";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Sheet } from "@/components/ui/sheet";
import { Input, Label } from "@/components/ui/field";
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
import { DateField, TimeField } from "@/components/ui/pickers";
import { clearUserCaches } from "@/lib/account-scope";
import { messageToneOn, setMessageTone, playMessageTone } from "@/lib/tones";
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
  // After Dark is its own private area with its own security policy: open it as a
  // fresh page load rather than an in-app jump.
  if (href?.startsWith("/dark"))
    return (
      <a href={href} className={cls}>
        {children}
      </a>
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
  const ctx = useCouple();
  const { me, partner, settings } = ctx;
  const [tone, setTone] = useState(() => (typeof window === "undefined" ? true : messageToneOn()));
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
  const [testing, setTesting] = useState(false);
  const [tested, setTested] = useState<Array<{
    device: string;
    ok: boolean;
    status?: number;
    reason?: string;
  }> | null>(null);
  /** Push a test to each of my devices and show, per device, whether it went. */
  async function sendTest() {
    if (testing) return;
    setTesting(true);
    try {
      const r = await fetch("/api/push/test", { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message ?? "Couldn't send a test.");
      setTested(d.results);
      const okCount = (d.results as Array<{ ok: boolean }>).filter((x) => x.ok).length;
      if (d.results.length === 0) toast("No device is set up for notifications yet.");
      else if (okCount === d.results.length) toast.ok("Sent. It should arrive in a few seconds.");
      else toast.err("Some devices refused it. The reason is under the button.");
    } catch (e) {
      toast.err(e instanceof Error ? e.message : "Couldn't send a test.");
    } finally {
      setTesting(false);
    }
  }
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
          <div className="flex min-h-11 items-center">
            <h1 className="display m-0 text-[28px] leading-[1.15]">Settings</h1>
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
                label="Message tone"
                sub="A soft chime when a message arrives while Clink is open. Calls always ring."
                checked={tone}
                onChange={(v) => {
                  setTone(v);
                  setMessageTone(v);
                  if (v) playMessageTone();
                }}
              />
            </div>
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
                onClick={async () => {
                  const r = await enablePush();
                  toast(
                    r === "granted"
                      ? "This device gets notifications. Sending a test now."
                      : r === "unsupported"
                        ? "Install Clink first, then turn these on."
                        : "Notifications are blocked in your browser settings.",
                  );
                  if (r === "granted") void sendTest();
                }}
              >
                <span className="flex items-center gap-2">
                  <BellRinging size={18} aria-hidden /> Notifications on this device
                </span>
                <CaretRight size={18} className="text-faint" aria-hidden />
              </Row>
              <Row last onClick={() => void sendTest()}>
                <span className="flex flex-col gap-0.5">
                  <span>{testing ? "Sending a test…" : "Send a test notification"}</span>
                  {tested && (
                    <span className="text-muted text-xs" role="status">
                      {tested.length === 0
                        ? "No device is set up yet. Turn on notifications on this device first."
                        : tested
                            .map(
                              (t) =>
                                `${t.device}: ${t.ok ? "sent" : `refused (${t.reason ?? t.status})`}`,
                            )
                            .join(" · ")}
                    </span>
                  )}
                </span>
                <CaretRight size={18} className="text-faint" aria-hidden />
              </Row>
            </div>
          </TabPanel>
        )}

        {tab === "privacy" && (
          <TabPanel key="privacy" className="flex flex-col gap-4">
            <PrivacyCard />
            {!ctx.solo && (
              <>
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
              </>
            )}
          </TabPanel>
        )}

        {tab === "account" && (
          <TabPanel key="account" className="flex flex-col gap-4">
            <h2 className="m-0 mt-1 text-lg font-bold">Linking and account</h2>
            <div className="rounded-card border-line bg-s1 overflow-hidden border">
              {ctx.solo ? (
                <Row href="/link">
                  <span>
                    Link with your partner
                    <span className="text-faint block text-[13px] font-normal">
                      Share your code, or enter theirs.
                    </span>
                  </span>
                  <CaretRight size={18} className="text-faint" aria-hidden />
                </Row>
              ) : (
                <>
                  <Row>
                    <span>Linked with {partner.name}</span>
                    <span className="text-muted text-sm font-normal">Since {since}</span>
                  </Row>
                  <div className="border-line flex min-h-14 items-center justify-between gap-3 border-b px-4 py-2.5">
                    <label htmlFor="started" className="text-base font-medium">
                      Together since
                    </label>
                    <DateField
                      id="started"
                      value={startedOn}
                      placeholder="Add a date"
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={async (next) => {
                        const prev = startedOn;
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
                      size="sm"
                      className="w-auto max-w-[200px]"
                    />
                  </div>
                  <RitualTimeRows />
                </>
              )}
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
                  await clearUserCaches();
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
                  await clearUserCaches();
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
              {!ctx.solo && (
                <Row danger onClick={() => setUnlink(1)}>
                  Unlink from {partner.name}
                </Row>
              )}
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
              <TimeField
                id="qs"
                value={quiet.start}
                onChange={(v) => setQuiet((q) => ({ ...q, start: v }))}
              />
            </div>
            <div>
              <Label htmlFor="qe">To</Label>
              <TimeField
                id="qe"
                value={quiet.end}
                onChange={(v) => setQuiet((q) => ({ ...q, end: v }))}
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

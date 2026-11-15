"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CaretRight,
  Trash,
  ChatCircle,
  BellSimple,
  BellRinging,
  Camera,
} from "@phosphor-icons/react";
import { useCouple } from "@/features/couple/context";
import { Avatar, type AvatarIcon } from "@/components/ui/avatar";
import { Button, IconButton } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Sheet } from "@/components/ui/sheet";
import { Input, Label, FieldError, Textarea } from "@/components/ui/field";
import { Display } from "@/components/ui/heading";
import { toast } from "@/components/ui/toast";
import { cn } from "@/components/ui/cn";
import { enablePush } from "@/lib/pwa";
import { PasskeyRows } from "./passkeys";
import { AccountRows } from "./accounts";
import { RitualTimeRows } from "./ritual-time";
import { PrivacyCard } from "./privacy";
import { FeelCard } from "./feel";
import { IdentityPicker } from "@/components/clink/identity-picker";
import { asIdentity } from "@/lib/app-identity";
import { AVATARS, avatarSrc } from "@/lib/avatars";
import { LOVE_LANGUAGES } from "@/features/partner/partner-sheet";

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
  const [icon, setIcon] = useState(asIdentity(settings.appIcon));
  const [discreet, setDiscreet] = useState(ctx.discreet);
  const [saved, setSaved] = useState(settings.allowSavedSpicyMine);
  const [savedBoth, setSavedBoth] = useState(settings.allowSavedSpicyBoth);
  const [unlink, setUnlink] = useState<0 | 1 | 2>(0);
  const [unlinkToken, setUnlinkToken] = useState<string | null>(null);
  const [del, setDel] = useState(false);
  const [delText, setDelText] = useState("");
  const [edit, setEdit] = useState(false);
  const [quietOpen, setQuietOpen] = useState(false);
  const [startedOn, setStartedOn] = useState(ctx.startedOn ?? "");
  const [busy, setBusy] = useState(false);

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

  const since = new Date(ctx.linkedAt)
    .toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    .toUpperCase();

  return (
    <div className="screen an-screen flex max-w-[760px] flex-col gap-4">
      <div className="flex items-center gap-3">
        <IconButton label="Back" onClick={() => router.push("/us")}>
          <ArrowLeft size={20} />
        </IconButton>
        <Display size={36}>Settings</Display>
      </div>

      <div className="flex items-center gap-3.5 py-1">
        <button
          type="button"
          onClick={() => setEdit(true)}
          aria-label="Change your picture"
          className="cursor-pointer rounded-full border-0 bg-transparent p-0"
        >
          <Avatar name={me.name} side="me" size={64} photoUrl={me.avatarUrl} icon={me.avatarIcon} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-lg font-bold">{me.name}</div>
          <div className="text-muted truncate text-sm">
            {me.city || me.timezone}
            {partner.nickname ? ` · ${partner.name} calls you "${partner.nickname}"` : ""}
          </div>
        </div>
        <Button variant="secondary" size="xs" onClick={() => setEdit(true)}>
          Edit profile
        </Button>
      </div>

      <h2 className="m-0 mt-1 text-lg font-bold">Notifications</h2>
      <div className="rounded-card border-line bg-s1 overflow-hidden border">
        <Toggle
          label="Clinks"
          checked={notify.clinks !== false}
          onChange={(v) => tog("clinks", v)}
        />
        <Toggle label="Chat" checked={notify.chat !== false} onChange={(v) => tog("chat", v)} />
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
            {quiet.start} to {quiet.end}
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

      <FeelCard />

      <h2 className="m-0 mt-1 text-lg font-bold">App icon and name</h2>
      <IdentityPicker value={icon} onChange={setIcon} />

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
                setSaved(v);
                const r = await fetch("/api/couple/allow-saved", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ allow: v }),
                });
                const d = await r.json();
                setSavedBoth(Boolean(d.both));
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

      <PrivacyCard />

      <h2 className="m-0 mt-1 text-lg font-bold">Linking and account</h2>
      <div className="rounded-card border-line bg-s1 overflow-hidden border">
        <Row>
          <span>Linked with {partner.name}</span>
          <span className="mono text-muted text-[13px]">SINCE {since}</span>
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
              setStartedOn(e.target.value);
              const r = await fetch("/api/couple", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ started_on: e.target.value || null }),
              });
              if (r.ok) toast("Saved. It's on your timeline.");
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

      <Sheet
        open={unlink > 0}
        onOpenChange={(v) => !v && setUnlink(0)}
        title={`Unlink from ${partner.name}`}
        handle
      >
        {unlink === 1 ? (
          <>
            <div className="mono text-faint text-xs">STEP 1 OF 2</div>
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
            <div className="mono text-faint text-xs">STEP 2 OF 2</div>
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
          within 1 hour. Everything else you made, including what {partner.name} can see, is deleted
          within 30 days.
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

      <Sheet open={quietOpen} onOpenChange={setQuietOpen} title="Quiet hours" handle>
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
            await patchSettings({ quiet_start: quiet.start, quiet_end: quiet.end });
            setQuietOpen(false);
            toast("Quiet hours saved.");
          }}
        >
          Save
        </Button>
      </Sheet>

      <ProfileSheet open={edit} onOpenChange={setEdit} />
    </div>
  );
}

function ProfileSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const { me, partner } = useCouple();
  const [name, setName] = useState(me.name);
  const [nick, setNick] = useState(me.nickname ?? "");
  const [phone, setPhone] = useState(me.phone ?? "");
  const [bio, setBio] = useState(me.bio ?? "");
  const [love, setLove] = useState<string | null>(me.loveLanguage);
  const [shareBday, setShareBday] = useState(me.shareBirthday);
  const [icon, setIcon] = useState<string>(me.avatarIcon);
  const [photo, setPhoto] = useState<string | null>(me.avatarUrl);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Edit profile" handle>
      <div className="display text-[28px]">You</div>
      <div className="flex items-center gap-4">
        <Avatar
          name={name}
          side="me"
          size={84}
          photoUrl={photo}
          icon={(photo ? me.avatarIcon : icon) as AvatarIcon}
        />
        <div className="flex flex-col gap-2">
          <Button
            size="sm"
            variant="secondary"
            loading={uploading}
            onClick={() => fileRef.current?.click()}
          >
            <Camera size={18} aria-hidden />
            {photo ? "Change photo" : "Upload a photo"}
          </Button>
          {photo && (
            <Button size="xs" variant="text" className="text-muted" onClick={() => setPhoto(null)}>
              Use a 3D face instead
            </Button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          data-testid="profile-photo"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            setUploading(true);
            try {
              const { uploadAvatar } = await import("@/lib/media/avatar");
              setPhoto(await uploadAvatar(f));
              toast.ok("Photo updated.");
              router.refresh();
            } catch (err) {
              toast.err(err instanceof Error ? err.message : "That photo didn't upload.");
            } finally {
              setUploading(false);
            }
          }}
        />
      </div>
      {!photo && (
        <div
          className="no-scrollbar -mx-1 flex flex-none gap-2 overflow-x-auto px-1 pb-1"
          role="radiogroup"
          aria-label="3D avatar"
        >
          {AVATARS.map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={icon === k}
              aria-label={label}
              onClick={() => setIcon(k)}
              className={cn(
                "flex h-14 w-14 flex-none cursor-pointer items-center justify-center rounded-[30%] border-0 p-0 transition-colors",
                icon === k ? "bg-accent/25" : "bg-s2",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatarSrc(k)} alt="" className="h-[72%] w-[72%] object-contain" />
            </button>
          ))}
        </div>
      )}
      <div>
        <Label htmlFor="pn">Your name</Label>
        <Input id="pn" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="nick">What you call {partner.name}</Label>
        <Input
          id="nick"
          value={nick}
          maxLength={40}
          placeholder="A nickname, no pronouns needed"
          onChange={(e) => setNick(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="bio">About you</Label>
        <Textarea
          id="bio"
          value={bio}
          maxLength={160}
          rows={2}
          placeholder={`A line for ${partner.name}: what you're into, what you're up to`}
          onChange={(e) => setBio(e.target.value)}
        />
      </div>
      <div>
        <div className="text-muted mb-1.5 text-sm font-medium">Your love language</div>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Love language">
          {Object.entries(LOVE_LANGUAGES).map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={love === k}
              onClick={() => setLove(love === k ? null : k)}
              className={cn(
                "h-9 cursor-pointer rounded-full border-0 px-3 text-xs font-semibold",
                love === k ? "bg-accent text-on-accent" : "bg-s2 text-text",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-card border-line flex-none overflow-hidden border">
        <Toggle
          label="Show my birthday to them"
          sub={
            me.birthday
              ? "Day and month only, never the year."
              : "Uses the date of birth you gave at sign-up."
          }
          checked={shareBday}
          onChange={setShareBday}
          last
        />
      </div>
      <div>
        <Label htmlFor="ph">Your number (optional)</Label>
        <Input
          id="ph"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          placeholder="+44 7700 900123"
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      <FieldError>{error}</FieldError>
      <Button
        loading={saving}
        onClick={async () => {
          setError(null);
          setSaving(true);
          const body: Record<string, unknown> = {
            display_name: name,
            partner_nickname: nick,
            phone,
            bio,
            love_language: love,
            share_birthday: shareBday,
          };
          if (!photo && (icon !== me.avatarIcon || me.avatarUrl)) body.avatar_icon = icon;
          const r = await fetch("/api/me/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          setSaving(false);
          if (!r.ok) return setError((await r.json()).message);
          onOpenChange(false);
          toast.ok("Profile saved.");
          router.refresh();
        }}
      >
        Save
      </Button>
      <Link href="/onboarding?edit=1" className="text-muted text-center text-sm font-medium">
        Change home city
      </Link>
    </Sheet>
  );
}

"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, CaretRight, Check } from "@phosphor-icons/react";
import { useCouple } from "@/features/couple/context";
import { Avatar, type AvatarIcon } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Input, Label, FieldError, Textarea } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { cn } from "@/components/ui/cn";
import { feedback } from "@/lib/feedback";
import { AvatarPicker } from "@/components/clink/avatar-picker";
import { LOVE_LANGUAGES } from "@/features/partner/partner-sheet";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** "03-14" reads as "14 March". */
function dayMonth(mmdd: string): string | null {
  const [m, d] = mmdd.split("-").map(Number);
  if (!m || !d || m > 12) return null;
  return `${d} ${MONTHS[m - 1]}`;
}

interface Draft {
  name: string;
  nick: string;
  bio: string;
  love: string | null;
  shareBday: boolean;
  icon: string;
  photo: string | null;
}

function same(a: Draft, b: Draft) {
  return (
    a.name.trim() === b.name.trim() &&
    a.nick.trim() === b.nick.trim() &&
    a.bio.trim() === b.bio.trim() &&
    a.love === b.love &&
    a.shareBday === b.shareBday &&
    a.icon === b.icon &&
    a.photo === b.photo
  );
}

/**
 * The Profile tab of Settings: picture, name, nickname, about, love language
 * and birthday sharing, edited in place. Save is optimistic: the form shows
 * saved straight away and rolls back with the server's message if it fails.
 */
export function ProfileCard() {
  const router = useRouter();
  const { me, partner } = useCouple();
  const initial: Draft = {
    name: me.name,
    nick: me.nickname ?? "",
    bio: me.bio ?? "",
    love: me.loveLanguage,
    shareBday: me.shareBirthday,
    icon: me.avatarIcon,
    photo: me.avatarUrl,
  };
  const [draft, setDraft] = useState<Draft>(initial);
  const [saved, setSaved] = useState<Draft>(initial);
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const dirty = !same(draft, saved);
  const set = (patch: Partial<Draft>) => {
    setError(null);
    setDraft((d) => ({ ...d, ...patch }));
  };
  const bday = me.birthday ? dayMonth(me.birthday) : null;

  async function save() {
    if (!draft.name.trim()) {
      setError("Give us something to call you.");
      return;
    }
    const before = saved;
    const next = draft;
    const body: Record<string, unknown> = {
      display_name: next.name,
      partner_nickname: next.nick,
      bio: next.bio,
      love_language: next.love,
      share_birthday: next.shareBday,
    };
    // Picking a 3D face (or dropping the photo) switches back from a photo.
    if (!next.photo && (next.icon !== me.avatarIcon || me.avatarUrl)) body.avatar_icon = next.icon;
    setError(null);
    setSaved(next);
    setPending((n) => n + 1);
    feedback("success");
    try {
      const r = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.message ?? "Couldn't save your profile.");
      }
      toast.ok("Profile saved.");
      router.refresh();
    } catch (e) {
      setSaved(before);
      setError(e instanceof Error ? e.message : "Couldn't save your profile.");
      toast.err("Couldn't save your profile.");
    } finally {
      setPending((n) => n - 1);
    }
  }

  const where = [
    me.city || me.timezone,
    partner.nickname && `${partner.name} calls you "${partner.nickname}"`,
  ]
    .filter(Boolean)
    .join(". ");

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <h2 className="sr-only">Profile</h2>

      <section
        aria-label="Your picture"
        className="rounded-card border-line bg-s1 flex flex-col gap-4 border p-4"
      >
        <div className="flex items-center gap-4">
          <Avatar
            name={draft.name || me.name}
            side="me"
            size={84}
            photoUrl={draft.photo}
            icon={(draft.photo ? me.avatarIcon : draft.icon) as AvatarIcon}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="min-w-0">
              <div className="truncate text-lg font-bold">{draft.name.trim() || me.name}</div>
              {where && <div className="text-muted truncate text-sm">{where}</div>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                loading={uploading}
                onClick={() => fileRef.current?.click()}
              >
                <Camera size={18} aria-hidden />
                {draft.photo ? "Change photo" : "Upload a photo"}
              </Button>
              {draft.photo && (
                <Button
                  size="sm"
                  variant="text"
                  className="text-muted"
                  onClick={() => set({ photo: null })}
                >
                  Use a 3D face instead
                </Button>
              )}
            </div>
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
              // Show the picked photo straight away while it uploads.
              const local = URL.createObjectURL(f);
              const prev = draft.photo;
              setDraft((d) => ({ ...d, photo: local }));
              setUploading(true);
              try {
                const { uploadAvatar } = await import("@/lib/media/avatar");
                const url = await uploadAvatar(f);
                setDraft((d) => ({ ...d, photo: url }));
                setSaved((s) => ({ ...s, photo: url }));
                toast.ok("Photo updated.");
                router.refresh();
              } catch (err) {
                setDraft((d) => ({ ...d, photo: prev }));
                toast.err(err instanceof Error ? err.message : "That photo didn't upload.");
              } finally {
                URL.revokeObjectURL(local);
                setUploading(false);
              }
            }}
          />
        </div>
        {!draft.photo && <AvatarPicker value={draft.icon} onChange={(icon) => set({ icon })} />}
      </section>

      <section
        aria-label="Your details"
        className="rounded-card border-line bg-s1 flex flex-col gap-4 border p-4"
      >
        <div>
          <Label htmlFor="pn">Your name</Label>
          <Input
            id="pn"
            value={draft.name}
            maxLength={40}
            autoComplete="nickname"
            invalid={!draft.name.trim()}
            onChange={(e) => set({ name: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="nick">What you call {partner.name}</Label>
          <Input
            id="nick"
            value={draft.nick}
            maxLength={40}
            placeholder="A nickname, no pronouns needed"
            onChange={(e) => set({ nick: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="bio">About you</Label>
          <Textarea
            id="bio"
            value={draft.bio}
            maxLength={160}
            rows={2}
            className="min-h-[88px]"
            placeholder={`A line for ${partner.name}: what you're into, what you're up to`}
            onChange={(e) => set({ bio: e.target.value })}
          />
          <div className="mono text-faint mt-1 text-right text-xs" aria-hidden>
            {draft.bio.length}/160
          </div>
        </div>
        <div>
          <div className="text-muted mb-1.5 text-sm font-medium">Your love language</div>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Love language">
            {Object.entries(LOVE_LANGUAGES).map(([k, label]) => {
              const on = draft.love === k;
              return (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => {
                    feedback("select");
                    set({ love: on ? null : k });
                  }}
                  className={cn(
                    "press flex h-11 cursor-pointer items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors",
                    on
                      ? "bg-accent text-on-accent border-transparent"
                      : "bg-s2 text-text border-line hover:border-line-strong",
                  )}
                >
                  {on && <Check size={14} weight="bold" aria-hidden />}
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="rounded-card border-line bg-s1 overflow-hidden border">
        <Toggle
          label="Show my birthday to them"
          sub={
            bday
              ? `${bday}. Day and month only, never the year.`
              : me.birthday
                ? "Day and month only, never the year."
                : "Uses the date of birth you gave at sign-up. Day and month only."
          }
          checked={draft.shareBday}
          onChange={(v) => set({ shareBday: v })}
        />
        <Link
          href="/onboarding?edit=1"
          className="press text-text hover:text-text flex min-h-14 items-center justify-between gap-3 px-4 py-2.5 text-base font-medium"
        >
          <span>
            Change home city
            <span className="text-faint block text-[13px] font-normal">
              {me.city || me.timezone}
            </span>
          </span>
          <CaretRight size={18} className="text-faint" aria-hidden />
        </Link>
      </div>

      <div
        className={cn(
          "rounded-card border-line bg-s1 flex items-center justify-between gap-3 border p-3 pl-4",
          dirty &&
            "sticky bottom-[calc(var(--chrome-bottom,0px)+12px)] z-10 shadow-[0_8px_24px_rgba(0,0,0,.35)]",
        )}
      >
        <div className="min-w-0 flex-1">
          {error ? (
            <FieldError>{error}</FieldError>
          ) : (
            <span className="text-muted flex items-center gap-1.5 text-sm" aria-live="polite">
              {dirty ? (
                "Unsaved changes"
              ) : pending > 0 ? (
                "Saving"
              ) : (
                <>
                  <Check size={16} weight="bold" className="text-accent" aria-hidden />
                  All changes saved
                </>
              )}
            </span>
          )}
        </div>
        <div className="flex flex-none items-center gap-2">
          {dirty && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setError(null);
                setDraft(saved);
              }}
            >
              Discard
            </Button>
          )}
          <Button type="submit" size="sm" disabled={!dirty}>
            Save
          </Button>
        </div>
      </div>
    </form>
  );
}

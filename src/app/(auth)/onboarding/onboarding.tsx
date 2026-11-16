"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { DEFAULT_AVATAR, avatarFrame, avatarSrc, toMemoji, type AvatarKey } from "@/lib/avatars";
import { AvatarPicker } from "@/components/clink/avatar-picker";
import { CityPicker, type City } from "@/components/clink/city-picker";
import { Button } from "@/components/ui/button";
import { Input, FieldError } from "@/components/ui/field";
import { Display, Lead, Mono } from "@/components/ui/heading";
import { toast } from "@/components/ui/toast";

type IconKey = AvatarKey;

async function patch(body: Record<string, unknown>) {
  const res = await fetch("/api/me/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json()).message ?? "Couldn't save that.");
}

export function Onboarding({
  needsDob,
  initialName,
  initialIcon,
  next,
  editing = false,
}: {
  editing?: boolean;
  needsDob: boolean;
  initialName: string;
  initialIcon: string;
  next: string | null;
}) {
  const router = useRouter();
  const [dobDone, setDobDone] = useState(!needsDob);
  const [step, setStep] = useState(editing ? 2 : 1);
  const [name, setName] = useState(initialName);
  const [icon, setIcon] = useState<IconKey>(toMemoji(initialIcon) ?? DEFAULT_AVATAR);
  const [photo, setPhoto] = useState<string | null>(null);
  const [city, setCity] = useState<City | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!dobDone) return <DobStep onDone={() => setDobDone(true)} />;

  async function advance() {
    setError(null);
    setBusy(true);
    try {
      if (step === 1) {
        if (!name.trim()) {
          setError("Give us something to call you.");
          return;
        }
        await patch({ display_name: name.trim() });
        setStep(2);
      } else if (step === 2) {
        await patch({ avatar_icon: icon });
        setStep(3);
      } else {
        const tz = city?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
        await patch({
          home_city: city?.city ?? tz.split("/").pop()?.replace(/_/g, " "),
          country: city?.country,
          timezone: tz,
          latitude: city?.lat,
          longitude: city?.lng,
          finish: true,
        });
        router.replace(editing ? "/settings" : next?.startsWith("/link") ? next : "/link");
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that.");
    } finally {
      setBusy(false);
    }
  }

  async function skip() {
    if (step === 1 && !name.trim()) {
      setError("We need at least a name. Everything else can wait.");
      return;
    }
    if (step < 3) {
      if (step === 1) await patch({ display_name: name.trim() }).catch(() => undefined);
      setStep(step + 1);
      return;
    }
    await advance();
  }

  async function uploadPhoto(file: File) {
    setBusy(true);
    try {
      const { uploadAvatar } = await import("@/lib/media/avatar");
      const url = await uploadAvatar(file);
      setPhoto(url);
      toast("Looking good.");
    } catch (e) {
      toast.err(e instanceof Error ? e.message : "That photo didn't upload.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="an-screen flex flex-1 flex-col">
      <div className="flex h-11 flex-none items-center gap-3">
        <div
          className="flex flex-1 gap-1.5"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={3}
          aria-valuenow={step}
          aria-label="Setup progress"
        >
          {[1, 2, 3].map((i) => (
            <span
              key={i}
              className="h-1 flex-1 rounded-full"
              style={{ background: i <= step ? "var(--accent)" : "var(--line)" }}
            />
          ))}
        </div>
        <Button variant="text" size="sm" className="text-muted px-3" onClick={skip}>
          Skip
        </Button>
      </div>
      <Mono className="mt-4">Step {step} of 3</Mono>

      {step === 1 && (
        <div key="1" className="an-reveal">
          <Display size={36} className="mt-3">
            What should we call you?
          </Display>
          <Lead className="mt-2 mb-6">Your partner sees this. Nicknames welcome.</Lead>
          <Input
            aria-label="Your name"
            autoFocus
            autoComplete="nickname"
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && advance()}
            className="border-accent h-14 border-2 text-lg font-medium"
          />
        </div>
      )}

      {step === 2 && (
        <div key="2" className="an-reveal">
          <Display size={36} className="mt-3">
            Pick your avatar
          </Display>
          <Lead className="mt-2 mb-5">Pick a face and a mood. Or upload your own photo.</Lead>
          <div className="mb-5 flex items-center gap-4">
            <div className="rounded-card border-line bg-s2 relative flex h-24 w-24 flex-none items-center justify-center overflow-hidden border">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt="Your photo" className="h-full w-full object-cover" />
              ) : (
                <motion.img
                  key={icon}
                  src={avatarSrc(icon)}
                  alt=""
                  initial={{ opacity: 0.01 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
                  className="h-full w-full object-contain"
                  style={{ transform: avatarFrame(icon) }}
                />
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <Button
                variant="secondary"
                size="sm"
                loading={busy && step === 2}
                onClick={() => fileRef.current?.click()}
              >
                <Camera size={18} aria-hidden />
                {photo ? "Change photo" : "Upload a photo"}
              </Button>
              {photo && (
                <Button
                  variant="text"
                  size="xs"
                  className="text-muted"
                  onClick={() => setPhoto(null)}
                >
                  Use a 3D face instead
                </Button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])}
            />
          </div>
          <AvatarPicker
            value={photo ? null : icon}
            onChange={(k) => {
              setIcon(k);
              setPhoto(null);
            }}
          />
        </div>
      )}

      {step === 3 && (
        <div key="3" className="an-reveal">
          <Display size={36} className="mt-3">
            Where&apos;s home?
          </Display>
          <Lead className="mt-2 mb-6">
            For your clock and quiet hours. Never a precise location.
          </Lead>
          <CityPicker value={city} onChange={setCity} autoFocus />
        </div>
      )}

      <FieldError>{error}</FieldError>
      <div className="min-h-6 flex-1" />
      <Button className="flex-none" loading={busy} onClick={advance}>
        Continue
      </Button>
    </div>
  );
}

function DobStep({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/me/dob", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day: Number(day), month: Number(month), year: Number(year) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message);
        return;
      }
      if (data.blocked) {
        router.replace("/signup?blocked=1");
        return;
      }
      onDone();
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="an-screen flex flex-1 flex-col">
      <Display size={36} className="mt-4">
        When&apos;s your birthday?
      </Display>
      <Lead className="mt-2 mb-6">Clink is 18+. Your partner never sees this.</Lead>
      <div className="grid grid-cols-[1fr_1fr_1.6fr] gap-2">
        <Input
          aria-label="Day"
          inputMode="numeric"
          placeholder="DD"
          mono
          className="text-center"
          value={day}
          onChange={(e) => setDay(e.target.value.replace(/\D/g, "").slice(0, 2))}
        />
        <Input
          aria-label="Month"
          inputMode="numeric"
          placeholder="MM"
          mono
          className="text-center"
          value={month}
          onChange={(e) => setMonth(e.target.value.replace(/\D/g, "").slice(0, 2))}
        />
        <Input
          aria-label="Year"
          inputMode="numeric"
          placeholder="YYYY"
          mono
          className="text-center"
          value={year}
          onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
        />
      </div>
      <FieldError>{error}</FieldError>
      <div className="min-h-6 flex-1" />
      <Button loading={busy} disabled={!day || !month || year.length < 4} onClick={save}>
        Continue
      </Button>
    </div>
  );
}

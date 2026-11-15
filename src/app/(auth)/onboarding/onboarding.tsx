"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  Check,
  MagnifyingGlass,
  Moon,
  Plant,
  Cat,
  Coffee,
  Sparkle,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input, FieldError, Hint } from "@/components/ui/field";
import { Display, Lead, Mono } from "@/components/ui/heading";
import { cn } from "@/components/ui/cn";
import { toast } from "@/components/ui/toast";
import { formatClock } from "@/lib/time";

const ICONS = [
  ["moon", Moon],
  ["plant", Plant],
  ["cat", Cat],
  ["coffee", Coffee],
  ["sparkle", Sparkle],
] as const;
type IconKey = (typeof ICONS)[number][0];

interface City {
  city: string;
  country: string;
  timezone: string;
  lat: number;
  lng: number;
}

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
  const [icon, setIcon] = useState<IconKey>((initialIcon as IconKey) ?? "moon");
  const [photo, setPhoto] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<City[]>([]);
  const [city, setCity] = useState<City | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/cities?q=${encodeURIComponent(query.trim())}`, {
          signal: ctrl.signal,
        });
        const data = await res.json();
        setResults(data.cities ?? []);
      } catch {
        /* aborted */
      }
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

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
      <Mono className="mt-4">STEP {step} OF 3</Mono>

      {step === 1 && (
        <div key="1" className="an-reveal">
          <Display size={36} className="mt-3">
            What should we <em>call</em> you?
          </Display>
          <Lead className="mt-2 mb-6">Your person sees this. Nicknames welcome.</Lead>
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
            Pick a <em>face</em>
          </Display>
          <Lead className="mt-2 mb-6">A photo, or one of ours.</Lead>
          <div className="grid grid-cols-3 gap-4" role="radiogroup" aria-label="Avatar">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="press border-faint text-muted flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-full border-[1.5px] border-dashed bg-transparent text-sm font-medium"
              style={photo ? { border: "3px solid var(--accent)", padding: 0 } : undefined}
            >
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt="Your photo" className="h-full w-full object-cover" />
              ) : (
                <>
                  <Camera size={26} aria-hidden />
                  Photo
                </>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])}
            />
            {ICONS.map(([key, Icon]) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={!photo && icon === key}
                aria-label={key}
                onClick={() => {
                  setIcon(key);
                  setPhoto(null);
                }}
                className="press bg-s2 text-text flex aspect-square cursor-pointer items-center justify-center rounded-full"
                style={{
                  border:
                    !photo && icon === key ? "3px solid var(--accent)" : "1px solid var(--line)",
                }}
              >
                <Icon size={34} aria-hidden />
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div key="3" className="an-reveal">
          <Display size={36} className="mt-3">
            Where&apos;s <em>home</em>?
          </Display>
          <Lead className="mt-2 mb-6">
            For your clock and quiet hours. Never a precise location.
          </Lead>
          <div className="rounded-input border-line bg-s2 focus-within:border-accent flex h-[52px] items-center gap-2.5 border px-4">
            <MagnifyingGlass size={20} className="text-muted" aria-hidden />
            <input
              aria-label="Search for your city"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Start typing a city"
              className="text-text h-full min-w-0 flex-1 bg-transparent text-base outline-none"
            />
          </div>
          {query.trim().length >= 2 && results.length > 0 && (
            <ul
              role="listbox"
              aria-label="Cities"
              className="rounded-card border-line bg-s1 m-0 mt-2 list-none overflow-hidden border p-0"
            >
              {results.map((c, i) => {
                const on = city?.city === c.city && city.country === c.country;
                return (
                  <li key={`${c.city}-${c.country}`} role="option" aria-selected={on}>
                    <button
                      type="button"
                      onClick={() => setCity(c)}
                      className={cn(
                        "flex w-full cursor-pointer items-center justify-between bg-transparent px-4 py-3.5 text-left",
                        i < results.length - 1 && "border-line border-b",
                        on ? "text-text" : "text-muted",
                      )}
                    >
                      <span className={cn("text-base", on ? "font-medium" : "font-normal")}>
                        {c.city}, {c.country}
                      </span>
                      <span className="flex items-center gap-2.5">
                        <span className="mono text-muted text-sm">
                          {formatClock(now, c.timezone)}
                        </span>
                        {on && <Check size={20} className="text-accent" aria-hidden />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {(query.trim().length < 2 || !results.length) && city && (
            <Hint>
              {city.city}, {city.country} · {formatClock(now, city.timezone)}
            </Hint>
          )}
        </div>
      )}

      <FieldError>{error}</FieldError>
      <div className="min-h-6 flex-1" />
      <Button
        className="flex-none"
        loading={busy}
        disabled={step === 3 && !city && query.length > 0}
        onClick={advance}
      >
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
      <Mono className="mt-4">FIRST, ONE CHECK</Mono>
      <Display size={36} className="mt-3">
        When&apos;s your <em>birthday</em>?
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

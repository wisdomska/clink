"use client";
import { useEffect, useState } from "react";
import { Check, MagnifyingGlass, MapPin } from "@phosphor-icons/react";
import { cn } from "@/components/ui/cn";
import { Hint, Label } from "@/components/ui/field";
import { formatClock } from "@/lib/time";
import { Select } from "@/components/ui/select";

export interface City {
  city: string;
  country: string;
  timezone: string;
  lat: number;
  lng: number;
}
interface Country {
  country: string;
  timezone: string;
  lat: number;
  lng: number;
}

/**
 * Home city search. Searches a world place list as you type; if your town
 * isn't there, use exactly what you typed and pick your country, and we take
 * the country's time zone. Never stores a precise location.
 */
export function CityPicker({
  value,
  onChange,
  autoFocus = false,
}: {
  value: City | null;
  onChange: (c: City | null) => void;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [manual, setManual] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [now, setNow] = useState(() => new Date());
  const q = query.trim();

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (q.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/cities?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const data = await res.json();
        setResults(data.cities ?? []);
      } catch {
        /* aborted or offline */
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    if (!manual || countries.length) return;
    void fetch("/api/cities?countries=1")
      .then((r) => r.json())
      .then((d) => setCountries(d.countries ?? []))
      .catch(() => undefined);
  }, [manual, countries.length]);

  const showList = q.length >= 2 && !manual;

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-input border-line bg-s2 focus-within:border-accent flex h-[52px] items-center gap-2.5 border px-4">
        <MagnifyingGlass size={20} className="text-muted" aria-hidden />
        <input
          aria-label="Search for your city"
          autoFocus={autoFocus}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setManual(false);
          }}
          placeholder="Start typing your city or town"
          className="text-text h-full min-w-0 flex-1 bg-transparent text-base outline-none focus-visible:shadow-none"
        />
      </div>

      {showList && (
        <ul
          role="listbox"
          aria-label="Cities"
          className="rounded-card border-line bg-s1 m-0 list-none overflow-hidden border p-0"
        >
          {results.map((c) => {
            const on = value?.city === c.city && value.country === c.country;
            return (
              <li
                key={`${c.city}-${c.country}-${c.lat}`}
                role="option"
                aria-selected={on}
                className="border-line border-b"
              >
                <button
                  type="button"
                  onClick={() => onChange(c)}
                  className={cn(
                    "flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 bg-transparent px-4 py-3 text-left",
                    on ? "text-text" : "text-muted",
                  )}
                >
                  <span className={cn("text-base", on ? "font-medium" : "font-normal")}>
                    {c.city}, {c.country}
                  </span>
                  <span className="flex flex-none items-center gap-2.5">
                    <span className="mono text-muted text-sm">{formatClock(now, c.timezone)}</span>
                    {on && <Check size={20} className="text-accent" aria-hidden />}
                  </span>
                </button>
              </li>
            );
          })}
          {loading && !results.length && (
            <li className="text-muted border-line border-b px-4 py-3 text-sm">Searching…</li>
          )}
          <li>
            <button
              type="button"
              onClick={() => {
                setManual(true);
                onChange(null);
              }}
              className="text-accent flex min-h-12 w-full cursor-pointer items-center gap-2.5 bg-transparent px-4 py-3 text-left text-sm font-semibold"
            >
              <MapPin size={18} weight="fill" aria-hidden />
              {results.length ? `Not listed? Use “${q}”` : `Use “${q}”`}
            </button>
          </li>
        </ul>
      )}

      {manual && q.length >= 2 && (
        <div className="rounded-card border-line bg-s1 flex flex-col gap-2 border p-4">
          <Label htmlFor="home-country">Which country is {q} in?</Label>
          <Select
            id="home-country"
            value={value?.city === q ? value.country : ""}
            placeholder={countries.length ? "Choose a country" : "Loading countries…"}
            disabled={!countries.length}
            options={countries.map((c) => ({ value: c.country, label: c.country }))}
            onChange={(v) => {
              const c = countries.find((x) => x.country === v);
              onChange(
                c
                  ? { city: q, country: c.country, timezone: c.timezone, lat: c.lat, lng: c.lng }
                  : null,
              );
            }}
          />
          <Hint>We use the country&apos;s time zone for your clock and quiet hours.</Hint>
        </div>
      )}

      {value && (
        <Hint>
          Home: {value.city}, {value.country} · {formatClock(now, value.timezone)}
        </Hint>
      )}
    </div>
  );
}

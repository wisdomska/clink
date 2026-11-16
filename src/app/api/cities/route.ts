import type { NextRequest } from "next/server";
import cityTimezones from "city-timezones";
import { ok } from "@/lib/server/api";

interface Row {
  city: string;
  city_ascii: string;
  country: string;
  iso2: string;
  timezone: string;
  lat: number;
  lng: number;
  pop: number;
}
interface City {
  city: string;
  country: string;
  timezone: string;
  lat: number;
  lng: number;
}

const ALL = (cityTimezones.cityMapping as Row[]).filter((c) => c.timezone);
const round = (n: number) => Math.round(n * 1000) / 1000;
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Countries for the "can't find it" fallback: the time zone of each country's biggest city. */
const COUNTRIES = (() => {
  const best = new Map<string, Row>();
  for (const c of ALL) {
    const cur = best.get(c.country);
    if (!cur || c.pop > cur.pop) best.set(c.country, c);
  }
  return [...best.values()]
    .map((c) => ({
      country: c.country,
      timezone: c.timezone,
      lat: round(c.lat),
      lng: round(c.lng),
    }))
    .sort((a, b) => a.country.localeCompare(b.country));
})();

/** Offline match on any word of the name: "tak" finds Sekondi-Takoradi. */
function offline(q: string): City[] {
  const f = fold(q);
  return ALL.filter((c) => {
    const n = fold(c.city_ascii || c.city);
    return n.startsWith(f) || n.split(/[\s\-']+/).some((w) => w.startsWith(f));
  })
    .sort((a, b) => b.pop - a.pop)
    .slice(0, 8)
    .map((c) => ({
      city: c.city,
      country: c.country,
      timezone: c.timezone,
      lat: round(c.lat),
      lng: round(c.lng),
    }));
}

/**
 * GeoNames through Open-Meteo's free geocoder (no key): every populated place
 * with roughly 1,000+ people, with its time zone. Times out quickly so the
 * offline list still answers if it's slow or down.
 */
async function online(q: string): Promise<City[]> {
  try {
    const r = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=10&language=en&format=json`,
      { signal: AbortSignal.timeout(2500), next: { revalidate: 86400 } },
    );
    if (!r.ok) return [];
    const d = (await r.json()) as {
      results?: Array<{
        name: string;
        country?: string;
        admin1?: string;
        timezone?: string;
        latitude: number;
        longitude: number;
        feature_code?: string;
      }>;
    };
    return (d.results ?? [])
      .filter((x) => x.timezone && x.country && (x.feature_code ?? "PPL").startsWith("PPL"))
      .map((x) => ({
        city: asTyped(x.name, q),
        country: x.country!,
        timezone: x.timezone!,
        lat: round(x.latitude),
        lng: round(x.longitude),
      }));
  } catch {
    return [];
  }
}

/** Edit distance, for "Takoradze" vs "Takoradi". */
function distance(a: string, b: string) {
  const d = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0]!;
    d[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = d[j]!;
      d[j] = Math.min(d[j]! + 1, d[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return d[b.length]!;
}

/** If the official spelling is a near-miss of what they typed, show it their way. */
function asTyped(name: string, q: string) {
  const a = fold(name);
  const b = fold(q);
  if (a === b || b.length < 4 || distance(a, b) > 2) return name;
  return q.replace(/\b\p{L}/gu, (ch) => ch.toUpperCase());
}

/** Two results are the same place if same country and within ~25 km. */
const near = (a: City, b: City) =>
  a.country === b.country && Math.abs(a.lat - b.lat) < 0.25 && Math.abs(a.lng - b.lng) < 0.25;

/** Home city search (ACC-03): offline list first, then the wider world, deduped. */
export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("countries") === "1")
    return ok({ countries: COUNTRIES }, { headers: { "Cache-Control": "public, max-age=86400" } });
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return ok({ cities: [] });
  const first = offline(q);
  const more = await online(q);
  const cities: City[] = [];
  for (const c of [...first, ...more]) {
    if (cities.length >= 8) break;
    if (!cities.some((x) => near(x, c))) cities.push(c);
  }
  return ok({ cities }, { headers: { "Cache-Control": "public, max-age=86400" } });
}

import type { NextRequest } from "next/server";
import cityTimezones from "city-timezones";
import { ok } from "@/lib/server/api";

interface City {
  city: string;
  city_ascii: string;
  country: string;
  timezone: string;
  lat: number;
  lng: number;
  pop: number;
}

const ALL = (cityTimezones.cityMapping as City[]).filter((c) => c.timezone);

/** Home city search (ACC-03). Offline dataset, so no paid geocoding API. */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
  if (q.length < 2) return ok({ cities: [] });
  const seen = new Set<string>();
  const cities = ALL.filter(
    (c) => c.city_ascii.toLowerCase().startsWith(q) || c.city.toLowerCase().startsWith(q),
  )
    .sort((a, b) => b.pop - a.pop)
    .filter((c) => {
      const k = `${c.city}|${c.country}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 6)
    .map((c) => ({
      city: c.city,
      country: c.country,
      timezone: c.timezone,
      lat: Math.round(c.lat * 1000) / 1000,
      lng: Math.round(c.lng * 1000) / 1000,
    }));
  return ok({ cities }, { headers: { "Cache-Control": "public, max-age=86400" } });
}

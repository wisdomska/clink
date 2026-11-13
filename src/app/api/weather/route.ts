import type { NextRequest } from "next/server";
import { z } from "zod";

const schema = z.object({ lat: z.coerce.number().min(-90).max(90), lon: z.coerce.number().min(-180).max(180) });

const LABELS: Array<[number[], string]> = [
  [[0], "clear"],
  [[1, 2], "partly cloudy"],
  [[3], "cloudy"],
  [[45, 48], "foggy"],
  [[51, 53, 55, 56, 57], "drizzle"],
  [[61, 63, 65, 66, 67, 80, 81, 82], "rain"],
  [[71, 73, 75, 77, 85, 86], "snow"],
  [[95, 96, 99], "storms"],
];

/** HOME-06 weather via Open-Meteo (free, no key). Cached 30 minutes at the edge. */
export async function GET(req: NextRequest) {
  const parsed = schema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return Response.json({ error: "bad_coords" }, { status: 422 });
  const { lat, lon } = parsed.data;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(2)}&longitude=${lon.toFixed(2)}&current=temperature_2m,relative_humidity_2m,weather_code&timezone=auto`;
  try {
    const res = await fetch(url, { next: { revalidate: 1800 }, signal: AbortSignal.timeout(4000) });
    const data = await res.json();
    const code = Number(data.current?.weather_code ?? 0);
    let label = LABELS.find(([codes]) => codes.includes(code))?.[1] ?? "clear";
    const temp = Math.round(Number(data.current?.temperature_2m ?? 0));
    if (label === "clear" && temp >= 26 && Number(data.current?.relative_humidity_2m ?? 0) >= 65) label = "humid";
    return Response.json({ temp, label }, { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" } });
  } catch {
    return Response.json({ temp: null, label: null }, { status: 200 });
  }
}

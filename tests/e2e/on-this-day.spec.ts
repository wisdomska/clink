import { test, expect } from "./fixtures";
import { admin } from "./helpers";

// The 5-minute job nudges each person once a day, after 9am their time,
// when today is the anniversary of a moment from a year or more ago.
test("a year-ago moment earns a morning nudge, and only in the morning window", async ({
  couple,
}) => {
  const { a, nia, theo } = couple;
  const coupleId = (
    await admin.from("couple_members").select("couple_id").eq("user_id", nia.id).single()
  ).data!.couple_id as string;
  // A fixed-offset zone where it's the given hour right now (Etc/GMT signs are reversed).
  const zoneAt = (hour: number) => {
    let o = (((hour - new Date().getUTCHours()) % 24) + 24) % 24;
    if (o > 14) o -= 24;
    return o === 0 ? "UTC" : `Etc/GMT${o > 0 ? "-" : "+"}${Math.abs(o)}`;
  };
  // Put both partners where it's around midday right now.
  const zone = zoneAt(12);
  await admin.from("profiles").update({ timezone: zone }).in("id", [nia.id, theo.id]);
  const local = new Intl.DateTimeFormat("en-CA", { timeZone: zone }).format(new Date());
  const lastYear = `${Number(local.slice(0, 4)) - 1}${local.slice(4)}`;

  const tick = async () => {
    const r = await a.request.post("/api/jobs/tick", {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    expect(r.ok()).toBeTruthy();
    return (await r.json()).results["on-this-day"] as { nudged: number };
  };
  const before = (await tick()).nudged;
  await admin.from("timeline_entries").insert({
    couple_id: coupleId,
    kind: "manual",
    title: "Our first trip to Cape Coast",
    happened_on: lastYear,
  });
  // Both of them are due a nudge now.
  expect((await tick()).nudged).toBe(before + 2);

  // At night in their time zone, nobody is nudged.
  const nightZone = zoneAt(2);
  await admin.from("profiles").update({ timezone: nightZone }).in("id", [nia.id, theo.id]);
  expect((await tick()).nudged).toBe(before);
});

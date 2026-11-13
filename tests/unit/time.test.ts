import { describe, it, expect } from "vitest";
import { formatClock, isNight, diffLabel, inWindow, isQuietHours, countdownParts, zonedToUtc, zoneOffsetMinutes, localParts, wallTime } from "@/lib/time";

const at = (iso: string) => new Date(iso);

describe("time zone maths", () => {
  it("formats a 24h clock in each partner's zone", () => {
    const d = at("2026-11-13T21:14:00Z");
    expect(formatClock(d, "Europe/London")).toBe("21:14");
    expect(formatClock(d, "Africa/Accra")).toBe("21:14");
    expect(formatClock(d, "America/Toronto")).toBe("16:14");
  });

  it("shades night from 20:00 to 05:59", () => {
    expect(isNight(at("2026-11-13T20:00:00Z"), "Europe/London")).toBe(true);
    expect(isNight(at("2026-11-13T05:59:00Z"), "Europe/London")).toBe(true);
    expect(isNight(at("2026-11-13T06:00:00Z"), "Europe/London")).toBe(false);
    expect(isNight(at("2026-11-13T19:59:00Z"), "Europe/London")).toBe(false);
  });

  it("labels the gap between partners", () => {
    const d = at("2026-11-13T12:00:00Z");
    expect(diffLabel(d, "Europe/London", "Africa/Accra")).toBe("SAME HOUR");
    expect(diffLabel(d, "America/Toronto", "Africa/Accra")).toBe("5 H APART");
    expect(diffLabel(d, "Asia/Kolkata", "Europe/London")).toBe("5.5 H APART");
  });

  it("handles DST: London is 1 h from Accra in summer", () => {
    expect(diffLabel(at("2026-07-01T12:00:00Z"), "Europe/London", "Africa/Accra")).toBe("1 H APART");
    expect(zoneOffsetMinutes(at("2026-07-01T12:00:00Z"), "Europe/London")).toBe(60);
    expect(zoneOffsetMinutes(at("2026-12-01T12:00:00Z"), "Europe/London")).toBe(0);
  });

  it("detects quiet hours that wrap midnight", () => {
    expect(inWindow(23, 30, "23:00", "07:00")).toBe(true);
    expect(inWindow(6, 59, "23:00", "07:00")).toBe(true);
    expect(inWindow(7, 0, "23:00", "07:00")).toBe(false);
    expect(inWindow(12, 0, "13:00", "14:00")).toBe(false);
    expect(inWindow(13, 30, "13:00", "14:00")).toBe(true);
    expect(inWindow(10, 0, "09:00", "09:00")).toBe(false);
    expect(isQuietHours(at("2026-11-13T23:30:00Z"), "Africa/Accra", "23:00", "07:00")).toBe(true);
    expect(isQuietHours(at("2026-11-13T23:30:00Z"), "America/Toronto", "23:00", "07:00")).toBe(false);
  });

  it("counts down in days, hours and minutes and stops at zero", () => {
    expect(countdownParts(at("2026-11-13T21:28:00Z"), at("2026-11-22T06:40:00Z"))).toEqual({ days: 8, hours: 9, minutes: 12, done: false });
    expect(countdownParts(at("2026-11-23T00:00:00Z"), at("2026-11-22T06:40:00Z"))).toEqual({ days: 0, hours: 0, minutes: 0, done: true });
  });

  it("converts a wall time in a zone to UTC, including across DST", () => {
    expect(zonedToUtc("2026-11-22", "06:40", "Europe/London").toISOString()).toBe("2026-11-22T06:40:00.000Z");
    expect(zonedToUtc("2026-07-01", "21:00", "Europe/London").toISOString()).toBe("2026-07-01T20:00:00.000Z");
    expect(zonedToUtc("2026-11-16", "21:00", "America/Toronto").toISOString()).toBe("2026-11-17T02:00:00.000Z");
  });

  it("reads local parts and wall times", () => {
    const p = localParts(at("2026-11-14T01:00:00Z"), "America/Toronto");
    expect(p.dateKey).toBe("2026-11-13");
    expect(p.hour).toBe(20);
    expect(wallTime(at("2026-11-17T02:00:00Z"), "Africa/Accra", true)).toBe("02:00 Tue");
  });
});

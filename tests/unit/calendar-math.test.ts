import { describe, it, expect } from "vitest";
import {
  addDays,
  inMonth,
  isDayKey,
  isYearlyOn,
  keyOf,
  monthGrid,
  shiftMonth,
  weekdayOf,
  yearsSince,
} from "@/features/calendar/calendar-math";

describe("calendar maths", () => {
  it("builds a Monday-first 6-week grid", () => {
    const g = monthGrid({ y: 2026, m: 10 }); // November 2026 starts on a Sunday
    expect(g).toHaveLength(42);
    expect(g[0]).toBe("2026-10-26");
    expect(weekdayOf(g[0]!)).toBe(0);
    expect(g[6]).toBe("2026-11-01");
    expect(g.filter((k) => inMonth(k, { y: 2026, m: 10 }))).toHaveLength(30);
  });
  it("adds days and months across year ends", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftMonth({ y: 2026, m: 11 }, 1)).toEqual({ y: 2027, m: 0 });
    expect(shiftMonth({ y: 2026, m: 0 }, -1)).toEqual({ y: 2025, m: 11 });
    expect(keyOf(2026, 1, 30)).toBe("2026-03-02");
  });
  it("validates day keys", () => {
    expect(isDayKey("2026-11-16")).toBe(true);
    expect(isDayKey("2026-02-30")).toBe(false);
    expect(isDayKey("16/11/2026")).toBe(false);
    expect(isDayKey(null)).toBe(false);
  });
  it("puts 29 February birthdays on the 28th in other years", () => {
    expect(isYearlyOn("02-29", "2028-02-29")).toBe(true);
    expect(isYearlyOn("02-29", "2027-02-28")).toBe(true);
    expect(isYearlyOn("02-29", "2028-02-28")).toBe(false);
    expect(isYearlyOn("11-16", "2026-11-16")).toBe(true);
  });
  it("counts anniversary years", () => {
    expect(yearsSince("2023-05-04", "2026-05-04")).toBe(3);
  });
});

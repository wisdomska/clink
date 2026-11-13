import { describe, expect, it } from "vitest";
import { nextAnniversary, reachedMilestones } from "@/lib/milestones";

describe("milestones", () => {
  it("adds 100 days and anniversaries once reached", () => {
    const m = reachedMilestones("2024-01-10", "2025-01-10", true);
    expect(m.map((x) => x.key)).toEqual(["days-100", "anniversary-1"]);
    expect(m[0]).toEqual({ key: "days-100", title: "100 days together.", date: "2024-04-19" });
    expect(m[1]!.title).toBe("One year together.");
  });

  it("uses on-Clink wording and no anniversaries without a start date", () => {
    const m = reachedMilestones("2020-01-01", "2026-11-13", false);
    expect(m.map((x) => x.key)).toEqual(["days-100", "days-500", "days-1000"]);
    expect(m[0]!.title).toBe("100 days on Clink.");
  });

  it("nothing before day 100", () => {
    expect(reachedMilestones("2026-10-01", "2026-11-13", true)).toEqual([]);
  });

  it("counts down to the next anniversary, leap day safe", () => {
    expect(nextAnniversary("2020-11-20", "2026-11-13")).toEqual({
      years: 6,
      date: "2026-11-20",
      inDays: 7,
    });
    expect(nextAnniversary("2020-11-13", "2026-11-13").years).toBe(7);
    expect(nextAnniversary("2024-02-29", "2025-01-01").date).toBe("2025-02-28");
    const m = reachedMilestones("2020-02-29", "2023-03-01", true);
    expect(m.filter((x) => x.key.startsWith("anniversary")).map((x) => x.date)).toEqual([
      "2021-02-28",
      "2022-02-28",
      "2023-02-28",
    ]);
  });
});

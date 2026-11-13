import { describe, it, expect } from "vitest";
import {
  contiguousRank,
  effectiveRank,
  tierStatus,
  requestBlockedUntil,
  REQUEST_COOLDOWN_MS,
} from "@/lib/dark-logic";
import { dayNumber, streak, badges, bothDone } from "@/lib/challenges";
import { youtubeId } from "@/lib/youtube";
import { expectedPosition } from "@/features/plans/youtube-player";

describe("After Dark consent maths (spec 7.1)", () => {
  it("only counts tiers without gaps", () => {
    expect(contiguousRank([])).toBe(0);
    expect(contiguousRank(["Flirty", "Steamy"])).toBe(2);
    expect(contiguousRank(["Steamy", "Spicy"])).toBe(0);
    expect(contiguousRank(["Flirty", "Spicy"])).toBe(1);
  });
  it("the lower choice always wins, Unhinged needs both verified", () => {
    const all = ["Flirty", "Steamy", "Spicy", "Unhinged"];
    expect(effectiveRank(all, ["Flirty", "Steamy"], true)).toBe(2);
    expect(effectiveRank(all, all, false)).toBe(3);
    expect(effectiveRank(all, all, true)).toBe(4);
    expect(effectiveRank(all, [], true)).toBe(0);
  });
  it("labels each tier honestly without revealing more than opt-in state", () => {
    expect(tierStatus("Flirty", ["Flirty"], ["Flirty"], false, false)).toBe("open");
    expect(tierStatus("Steamy", ["Flirty", "Steamy"], ["Flirty"], false, false)).toBe(
      "waiting_on_them",
    );
    expect(tierStatus("Steamy", ["Flirty"], ["Flirty", "Steamy"], false, false)).toBe(
      "waiting_on_you",
    );
    expect(tierStatus("Spicy", [], [], false, false)).toBe("waiting_on_both");
    const all = ["Flirty", "Steamy", "Spicy", "Unhinged"];
    expect(tierStatus("Unhinged", all, all, true, false)).toBe("needs_verification");
    expect(tierStatus("Unhinged", all, all, true, true)).toBe("open");
  });
  it("blocks new requests for 12 h after a decline", () => {
    const now = Date.parse("2026-11-13T20:00:00Z");
    expect(requestBlockedUntil(null, now)).toBeNull();
    expect(requestBlockedUntil(new Date(now - 3600_000).toISOString(), now)).toBe(
      now - 3600_000 + REQUEST_COOLDOWN_MS,
    );
    expect(requestBlockedUntil(new Date(now - 13 * 3600_000).toISOString(), now)).toBeNull();
  });
});

describe("challenges (DATE-04)", () => {
  const d = (day: number, a: boolean, b: boolean) => ({
    day,
    done_by_a: a ? "x" : null,
    done_by_b: b ? "x" : null,
  });
  it("numbers days from the start date", () => {
    expect(dayNumber("2026-11-10", "2026-11-10")).toBe(1);
    expect(dayNumber("2026-11-10", "2026-11-16")).toBe(7);
  });
  it("counts the streak through today or yesterday", () => {
    const days = [
      d(1, true, true),
      d(2, true, true),
      d(3, true, false),
      d(4, true, true),
      d(5, true, true),
    ];
    expect(streak(days, 5)).toBe(2);
    expect(streak(days, 6)).toBe(2);
    expect(streak(days, 3)).toBe(2);
    expect(bothDone(days[2])).toBe(false);
  });
  it("awards badges", () => {
    const week = Array.from({ length: 7 }, (_, i) => d(i + 1, true, true));
    expect(badges(week, 8, 7)).toEqual(["First week", "No misses", "7 for 7"]);
    expect(badges(week.slice(0, 3), 4, 30)).toEqual(["No misses"]);
    expect(badges([d(1, true, false)], 2, 30)).toEqual([]);
  });
});

describe("watch party", () => {
  it("parses every common YouTube link", () => {
    expect(youtubeId("https://youtu.be/dQw4w9WgXcQ?t=42")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=x")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://m.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://vimeo.com/123")).toBeNull();
    expect(youtubeId("not a url")).toBeNull();
    expect(youtubeId("https://youtube.com/watch?v=short")).toBeNull();
  });
  it("projects the leader's playhead forward to correct drift", () => {
    expect(expectedPosition({ playing: true, position: 100, sentAt: 1000 }, 1500)).toBe(100.5);
    expect(expectedPosition({ playing: false, position: 100, sentAt: 1000 }, 9000)).toBe(100);
    expect(expectedPosition({ playing: true, position: 10, sentAt: 2000 }, 1000)).toBe(10);
  });
});

import { describe, it, expect } from "vitest";
import { parseDob, ageOn, isAdult, toIsoDate } from "@/lib/age";
import { pushText, categoryEnabled, DARK_TEXT, DISCREET_TEXT } from "@/lib/push-copy";
import { sanitizeEvent } from "@/lib/analytics-events";
import { extFor, expiryFor } from "@/lib/media-rules";

describe("age gate (ACC-02)", () => {
  it("rejects impossible dates", () => {
    expect(parseDob({ day: 31, month: 2, year: 2000 })).toBeNull();
    expect(parseDob({ day: 0, month: 1, year: 2000 })).toBeNull();
    expect(parseDob({ day: 1, month: 13, year: 2000 })).toBeNull();
    expect(parseDob({ day: 1, month: 1, year: 1800 })).toBeNull();
    expect(parseDob({ day: 1.5, month: 1, year: 2000 })).toBeNull();
  });
  it("counts birthdays exactly", () => {
    const dob = parseDob({ day: 14, month: 3, year: 2008 })!;
    expect(ageOn(dob, new Date("2026-03-13T23:59:00Z"))).toBe(17);
    expect(ageOn(dob, new Date("2026-03-14T00:00:00Z"))).toBe(18);
    expect(isAdult(dob, new Date("2026-03-13T12:00:00Z"))).toBe(false);
    expect(isAdult(dob, new Date("2026-03-14T12:00:00Z"))).toBe(true);
    expect(toIsoDate(dob)).toBe("2008-03-14");
  });
  it("handles a 29 February birthday", () => {
    const dob = parseDob({ day: 29, month: 2, year: 2008 })!;
    expect(ageOn(dob, new Date("2026-02-28T12:00:00Z"))).toBe(17);
    expect(ageOn(dob, new Date("2026-03-01T12:00:00Z"))).toBe(18);
  });
});

describe("push copy (spec 13.4)", () => {
  it("After Dark never carries content", () => {
    const t = pushText("dark", "Theo sent a nude", { detailed: true });
    expect(t.body).toBe(DARK_TEXT);
    expect(t.body.toLowerCase()).not.toContain("nude");
  });
  it("is discreet unless detailed text is on", () => {
    expect(pushText("chat", "Theo: hi", {}).body).toBe(DISCREET_TEXT);
    expect(pushText("chat", "Theo: hi", { detailed: true }).body).toBe("Theo: hi");
    expect(pushText("chat", "x", {}, "Notes").title).toBe("Notes");
  });
  it("After Dark notifications are opt-in, others opt-out", () => {
    expect(categoryEnabled("dark", {})).toBe(false);
    expect(categoryEnabled("dark", { dark: true })).toBe(true);
    expect(categoryEnabled("chat", {})).toBe(true);
    expect(categoryEnabled("chat", { chat: false })).toBe(false);
  });
});

describe("analytics never carry content (spec 16)", () => {
  it("drops unknown events and properties", () => {
    expect(sanitizeEvent("message_text", { text: "hi" })).toBeNull();
    expect(sanitizeEvent("message_sent", { type: "text", body: "secret" })).toEqual({
      name: "message_sent",
      props: { type: "text" },
    });
    expect(
      sanitizeEvent("dare_outcome", { tier: "Spicy", outcome: "passed", dare: "x" })?.props,
    ).toEqual({ tier: "Spicy", outcome: "passed" });
    expect(sanitizeEvent("message_sent", { type: "a".repeat(40) })?.props).toEqual({});
  });
});

describe("media rules", () => {
  it("maps types and expiries", () => {
    expect(extFor("image/webp")).toBe("webp");
    expect(extFor("audio/webm;codecs=opus")).toBe("webm");
    expect(extFor("application/x-unknown")).toBe("bin");
    const t0 = new Date("2026-11-13T00:00:00Z");
    expect(expiryFor("24h", t0)).toBe("2026-11-14T00:00:00.000Z");
    expect(expiryFor("7d", t0)).toBe("2026-11-20T00:00:00.000Z");
    expect(expiryFor("once", t0)).toBeNull();
  });
});

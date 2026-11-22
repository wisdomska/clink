import { describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => ({}) }));
vi.mock("@/lib/server/mail", () => ({ sendMail: vi.fn() }));
import { digestEmail, slowAlerts, weekOf } from "@/lib/server/digest";

const h = {
  errors: {
    total: 4,
    kinds: 2,
    previous: 9,
    top: [{ message: "<script>x</script> broke", count: 3 }],
  },
  calls: {
    total: 10,
    connected: 7,
    dropped: 1,
    missed: 2,
    minutes: 42,
    previous_total: 6,
    previous_dropped: 2,
  },
  pages: { views: 120, avg_ms: 1840, slow_share: 0.08, slowest: [{ path: "/chat", avg_ms: 2600 }] },
};

describe("weekly email", () => {
  it("says the week's numbers in the subject and body, never raw HTML from errors", () => {
    const m = digestEmail(h);
    expect(m.subject).toBe("Clink this week: 4 errors, 7/10 calls connected, 1.8 s loads");
    expect(m.text).toContain("Calls: 7 connected of 10 (42 min talked), 6 the week before.");
    expect(m.text).toContain("/chat: 2.6 s");
    expect(m.html).not.toContain("<script>");
    expect(m.html).toContain("&lt;script&gt;");
    expect(m.text).not.toMatch(/—/); // no em dashes in copy
  });
  it("says 1 error, not 1 errors", () => {
    const m = digestEmail({ ...h, errors: { ...h.errors, total: 1 } });
    expect(m.subject.startsWith("Clink this week: 1 error,")).toBe(true);
  });
  it("flags a screen slow more than 3 times, with where its time went", () => {
    const slowest = [
      {
        path: "/us",
        avg_ms: 5300,
        slow: 5,
        split: { server: 600, wait: 200, fetch: 900, render: 3600 },
      },
      { path: "/plans", avg_ms: 2900, slow: 3, split: null },
      { path: "/keep", avg_ms: 3100, slow: 4 },
    ];
    const alerts = slowAlerts({ pages: { ...h.pages, slowest } });
    expect(alerts).toEqual([
      "/us was slow 5 times (5.3 s on average). Most of it: drawing and data on the device (3.6 s).",
      "/keep was slow 4 times (3.1 s on average).",
    ]);
    const m = digestEmail({ ...h, pages: { ...h.pages, slowest } });
    expect(m.subject.startsWith("Clink this week: 2 slow screens, 4 errors")).toBe(true);
    expect(m.text.startsWith("Worth a look:")).toBe(true);
    expect(m.html).toContain("Worth a look");
    expect(m.text).not.toMatch(/—/);
  });
  it("says nothing extra when no screen was slow often", () => {
    expect(slowAlerts(h)).toEqual([]);
    expect(digestEmail(h).text).not.toContain("Worth a look");
  });
  it("groups days into Monday-started weeks", () => {
    expect(weekOf(new Date("2026-11-23T03:17:00Z"))).toBe("2026-11-23"); // a Monday
    expect(weekOf(new Date("2026-11-29T23:00:00Z"))).toBe("2026-11-23"); // that Sunday
    expect(weekOf(new Date("2026-11-20T10:00:00Z"))).toBe("2026-11-16");
  });
});

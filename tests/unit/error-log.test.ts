import { describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => ({}) }));
import { isHarmless } from "@/lib/server/error-log";

describe("error log", () => {
  it("leaves out errors that mean nothing went wrong", () => {
    expect(isHarmless("Transition was aborted because of invalid state. Document hidden")).toBe(
      true,
    );
    expect(isHarmless("The play() request was interrupted by a call to pause().")).toBe(true);
    expect(isHarmless("ResizeObserver loop completed with undelivered notifications.")).toBe(true);
  });
  it("keeps real ones", () => {
    expect(isHarmless("Cannot read properties of undefined (reading 'id')")).toBe(false);
    expect(isHarmless("Failed to fetch")).toBe(false);
  });
});

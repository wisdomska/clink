import { describe, it, expect } from "vitest";
import { isPrivatePath, scrub } from "@/components/vercel-analytics";

describe("Vercel Analytics privacy", () => {
  it("never counts After Dark or admin", () => {
    for (const p of ["/dark", "/dark/decks", "/admin", "/admin/users/1"])
      expect(scrub({ type: "pageview", url: "https://clinkapp.vercel.app" + p })).toBeNull();
    expect(isPrivatePath("/darkroom")).toBe(false);
  });
  it("drops the query string and hash", () => {
    expect(
      scrub({ type: "pageview", url: "https://clinkapp.vercel.app/link?code=ABC234#x" }),
    ).toEqual({ type: "pageview", url: "https://clinkapp.vercel.app/link" });
  });
});

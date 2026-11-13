import { describe, expect, it } from "vitest";
import { scrub } from "@/lib/sentry-options";

describe("Sentry scrubbing", () => {
  it("drops After Dark, media and admin errors entirely", () => {
    for (const url of [
      "https://clinkapp.vercel.app/dark/vault",
      "https://clinkapp.vercel.app/api/dark/send",
      "https://clinkapp.vercel.app/api/media/abc",
      "https://clinkapp.vercel.app/admin/users",
    ]) {
      expect(scrub({ type: undefined, request: { url } })).toBeNull();
    }
    expect(scrub({ type: undefined, transaction: "/dark" })).toBeNull();
  });

  it("strips bodies, query strings, cookies, users and breadcrumbs elsewhere", () => {
    const out = scrub({
      type: undefined,
      request: {
        url: "https://clinkapp.vercel.app/chat?q=secret",
        method: "POST",
        data: { body: "I miss you" },
        cookies: { a: "b" },
        headers: { authorization: "x" },
      },
      user: { id: "u1", email: "a@b.c" },
      breadcrumbs: [{ message: "typed" }],
      extra: { text: "hi" },
    });
    expect(out).not.toBeNull();
    expect(out!.request).toEqual({ method: "POST", url: "/chat" });
    expect(out!.user).toBeUndefined();
    expect(out!.breadcrumbs).toBeUndefined();
    expect(out!.extra).toBeUndefined();
  });

  it("keeps the event when no URL is known", () => {
    expect(scrub({ type: undefined, message: "boom" })).not.toBeNull();
  });
});

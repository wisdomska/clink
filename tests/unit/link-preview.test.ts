import { describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { cleanUrl, parseMeta, privateAddress } from "@/lib/server/link-preview";
import { splitLinks, firstLink } from "@/lib/links";

describe("links in messages", () => {
  it("finds links and leaves trailing punctuation out", () => {
    expect(firstLink("look: https://example.com/a?b=1.")).toBe("https://example.com/a?b=1");
    expect(firstLink("(see https://en.wikipedia.org/wiki/Accra_(city))")).toBe(
      "https://en.wikipedia.org/wiki/Accra_(city)",
    );
    expect(firstLink("no link here")).toBeNull();
    expect(splitLinks("a https://x.io b")).toEqual([
      { text: "a " },
      { text: "https://x.io", href: "https://x.io" },
      { text: " b" },
    ]);
  });
});

describe("link preview safety", () => {
  it("refuses private, loopback and odd addresses", () => {
    for (const ip of [
      "127.0.0.1",
      "10.1.2.3",
      "192.168.0.4",
      "172.20.0.1",
      "169.254.169.254",
      "::1",
      "fd00::1",
      "::ffff:127.0.0.1",
      "100.64.0.1",
    ])
      expect(privateAddress(ip), ip).toBe(true);
    for (const ip of ["8.8.8.8", "172.32.0.1", "2606:4700::1111"])
      expect(privateAddress(ip), ip).toBe(false);
    expect(cleanUrl("http://localhost:3000/x")).toBeNull();
    expect(cleanUrl("ftp://example.com")).toBeNull();
    expect(cleanUrl("http://169.254.169.254/latest")).toBeNull();
    expect(cleanUrl("http://[::1]/")).toBeNull();
    expect(cleanUrl("https://user:pw@example.com")).toBeNull();
    expect(cleanUrl("https://example.com:8080/")).toBeNull();
    expect(cleanUrl("https://printer.local/")).toBeNull();
    expect(cleanUrl("https://example.com/a#b")?.toString()).toBe("https://example.com/a");
  });
  it("reads Open Graph tags, falling back to <title>", () => {
    const base = new URL("https://www.example.com/post");
    const html = `<html><head><title>Fallback</title>
      <meta property="og:title" content="Jollof &amp; friends">
      <meta content='A night out in Osu' name="description">
      <meta property="og:image" content="/img/cover.jpg">
      <meta property="og:site_name" content="Example"></head><body>x</body></html>`;
    expect(parseMeta(html, base)).toEqual({
      title: "Jollof & friends",
      description: "A night out in Osu",
      site: "Example",
      image: "https://www.example.com/img/cover.jpg",
    });
    expect(parseMeta("<title> Just a title </title>", base)).toEqual({
      title: "Just a title",
      description: null,
      site: "example.com",
      image: null,
    });
  });
});

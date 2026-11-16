import { describe, expect, it } from "vitest";
import {
  appleTitleFromRef,
  detectService,
  embedUrl,
  isValidRef,
  parseMusicLink,
} from "@/features/plans/music-link";

describe("music links", () => {
  it("parses YouTube links as before", () => {
    expect(parseMusicLink("https://youtu.be/dQw4w9WgXcQ")).toEqual({
      service: "youtube",
      ref: "dQw4w9WgXcQ",
    });
    expect(parseMusicLink("https://www.youtube.com/watch?v=9bZkp7q19f0")?.ref).toBe("9bZkp7q19f0");
  });

  it("parses Spotify URLs and URIs", () => {
    const id = "4cOdK2wGLETKBW3PvgPWqT";
    expect(parseMusicLink(`https://open.spotify.com/track/${id}?si=abc`)).toEqual({
      service: "spotify",
      ref: `track/${id}`,
    });
    expect(parseMusicLink(`https://open.spotify.com/intl-de/album/${id}`)?.ref).toBe(`album/${id}`);
    expect(parseMusicLink(`https://open.spotify.com/embed/playlist/${id}`)?.ref).toBe(
      `playlist/${id}`,
    );
    expect(parseMusicLink(`spotify:episode:${id}`)?.ref).toBe(`episode/${id}`);
    expect(parseMusicLink("https://open.spotify.com/track/short")).toBeNull();
    expect(parseMusicLink(`https://evil.com/open.spotify.com/track/${id}`)).toBeNull();
  });

  it("parses Apple Music URLs", () => {
    expect(
      parseMusicLink(
        "https://music.apple.com/us/album/blinding-lights/1499378108?i=1499378615&l=en",
      ),
    ).toEqual({ service: "apple_music", ref: "us/album/blinding-lights/1499378108?i=1499378615" });
    expect(
      parseMusicLink(
        "https://music.apple.com/gb/playlist/todays-hits/pl.f4d106fed2bd41149aaacabb233eb5eb",
      )?.ref,
    ).toBe("gb/playlist/todays-hits/pl.f4d106fed2bd41149aaacabb233eb5eb");
    expect(parseMusicLink("https://music.apple.com/us/browse")).toBeNull();
  });

  it("detects the service while typing", () => {
    expect(detectService("")).toBeNull();
    expect(detectService("https://open.spot")).toBeNull();
    expect(detectService("https://open.spotify.com/")).toBe("spotify");
    expect(detectService("spotify:")).toBe("spotify");
    expect(detectService("music.apple.com/us")).toBe("apple_music");
    expect(detectService("https://youtu.be/")).toBe("youtube");
    expect(detectService("https://example.com/song.mp3")).toBeNull();
  });

  it("refuses unsupported links", () => {
    expect(parseMusicLink("https://example.com/song.mp3")).toBeNull();
    expect(parseMusicLink("javascript:alert(1)")).toBeNull();
  });

  it("builds official embed URLs only from valid refs", () => {
    expect(embedUrl("spotify", "track/4cOdK2wGLETKBW3PvgPWqT")).toBe(
      "https://open.spotify.com/embed/track/4cOdK2wGLETKBW3PvgPWqT?theme=0",
    );
    expect(embedUrl("apple_music", "us/album/x/1?i=2")).toBe(
      "https://embed.music.apple.com/us/album/x/1?i=2",
    );
    expect(embedUrl("spotify", "track/../../evil")).toBeNull();
    expect(isValidRef("apple_music", 'us/album/x/1"><script>')).toBe(false);
    expect(appleTitleFromRef("us/album/blinding-lights/1?i=2")).toBe("Blinding lights");
  });
});

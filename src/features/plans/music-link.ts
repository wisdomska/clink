import { youtubeId } from "@/lib/youtube";

/**
 * Listen together: music links we can play. Each parsed link becomes a
 * `service` plus a `ref`, which is all the queue stores (in `video_id`):
 * - youtube:     the 11-character video id
 * - spotify:     "{type}/{id}", e.g. "track/4cOdK2wGLETKBW3PvgPWqT"
 * - apple_music: "{storefront}/{kind}/{slug}/{id}[?i={songId}]"
 */
export type MusicService = "youtube" | "spotify" | "apple_music";
export interface MusicLink {
  service: MusicService;
  ref: string;
}

export const SERVICE_LABEL: Record<MusicService, string> = {
  youtube: "YouTube",
  spotify: "Spotify",
  apple_music: "Apple Music",
};

export const UNSUPPORTED_LINK =
  "That link isn't one we can play. Paste a YouTube, Spotify or Apple Music link.";

const SPOTIFY_TYPES = ["track", "album", "playlist", "episode"] as const;
const SPOTIFY_REF = /^(track|album|playlist|episode)\/[A-Za-z0-9]{22}$/;
const APPLE_KINDS = ["album", "playlist", "song", "music-video", "station"] as const;
const APPLE_REF =
  /^[a-z]{2}\/(album|playlist|song|music-video|station)\/(?:[A-Za-z0-9._~%-]{1,200}\/)?[A-Za-z0-9._-]{1,80}(\?i=\d{1,20})?$/;
const YOUTUBE_REF = /^[A-Za-z0-9_-]{11}$/;

function spotifyRef(s: string): string | null {
  const uri = s.match(/^spotify:(track|album|playlist|episode):([A-Za-z0-9]{22})$/);
  if (uri) return `${uri[1]}/${uri[2]}`;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  if (u.hostname !== "open.spotify.com") return null;
  // Paths: /track/ID, /intl-de/track/ID, /embed/track/ID, /user/x/playlist/ID.
  const parts = u.pathname.split("/").filter(Boolean);
  for (let i = 0; i < parts.length - 1; i++) {
    const type = parts[i] as (typeof SPOTIFY_TYPES)[number];
    if (SPOTIFY_TYPES.includes(type) && /^[A-Za-z0-9]{22}$/.test(parts[i + 1]!)) {
      return `${type}/${parts[i + 1]}`;
    }
  }
  return null;
}

function appleRef(s: string): string | null {
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname;
  if (host !== "music.apple.com" && host !== "embed.music.apple.com") return null;
  const parts = u.pathname.split("/").filter(Boolean);
  // /{storefront}/{kind}/{slug?}/{id}
  const [store, kind, ...rest] = parts;
  if (!store || !/^[a-z]{2}$/.test(store)) return null;
  if (!kind || !(APPLE_KINDS as readonly string[]).includes(kind)) return null;
  if (rest.length < 1 || rest.length > 2) return null;
  const songId = u.searchParams.get("i");
  const ref = `${store}/${kind}/${rest.join("/")}${songId && /^\d{1,20}$/.test(songId) ? `?i=${songId}` : ""}`;
  return APPLE_REF.test(ref) ? ref : null;
}

/** Which service a (possibly half-typed) link points at, for the logo next to the input. */
export function detectService(input: string): MusicService | null {
  const s = input.trim().toLowerCase();
  if (!s) return null;
  if (s.startsWith("spotify:") || /(^|\/\/|\.)(open\.)?spotify\.com/.test(s)) return "spotify";
  if (/(^|\/\/|\.)(embed\.)?music\.apple\.com/.test(s)) return "apple_music";
  if (/(^|\/\/|\.)(youtube\.com|youtu\.be|youtube-nocookie\.com)/.test(s)) return "youtube";
  if (YOUTUBE_REF.test(input.trim())) return "youtube";
  return null;
}

/** Parse a pasted link into something playable, or null. */
export function parseMusicLink(input: string): MusicLink | null {
  const s = input.trim();
  if (!s || s.length > 500) return null;
  const svc = detectService(s);
  if (svc === "spotify") {
    const ref = spotifyRef(s);
    return ref ? { service: "spotify", ref } : null;
  }
  if (svc === "apple_music") {
    const ref = appleRef(s);
    return ref ? { service: "apple_music", ref } : null;
  }
  const yt = youtubeId(s);
  return yt ? { service: "youtube", ref: yt } : null;
}

/** Re-validate a stored ref (defence in depth before it goes into an iframe src). */
export function isValidRef(service: MusicService, ref: string): boolean {
  if (service === "youtube") return YOUTUBE_REF.test(ref);
  if (service === "spotify") return SPOTIFY_REF.test(ref);
  return APPLE_REF.test(ref);
}

/** Official embed URL for Spotify and Apple Music (YouTube uses the synced IFrame API player). */
export function embedUrl(service: Exclude<MusicService, "youtube">, ref: string): string | null {
  if (!isValidRef(service, ref)) return null;
  if (service === "spotify") return `https://open.spotify.com/embed/${ref}?theme=0`;
  return `https://embed.music.apple.com/${ref}`;
}

/** "track/ID" -> "spotify:track:ID" for the Spotify iFrame API, or null when the ref is invalid. */
export function spotifyUri(ref: string): string | null {
  return SPOTIFY_REF.test(ref) ? `spotify:${ref.replace("/", ":")}` : null;
}

/**
 * Single tracks and episodes can be kept in step between devices. Albums and
 * playlists can't: the embed moves through their tracks on its own and gives
 * no way to tell which one is playing.
 */
export function isSpotifySyncable(ref: string): boolean {
  return SPOTIFY_REF.test(ref) && (ref.startsWith("track/") || ref.startsWith("episode/"));
}

/** The public page for a stored item, used for oEmbed title lookups. */
export function canonicalUrl(link: MusicLink): string {
  if (link.service === "youtube") return `https://www.youtube.com/watch?v=${link.ref}`;
  if (link.service === "spotify") return `https://open.spotify.com/${link.ref}`;
  return `https://music.apple.com/${link.ref}`;
}

/** A readable fallback title from an Apple Music slug ("blinding-lights" -> "Blinding lights"). */
export function appleTitleFromRef(ref: string): string | null {
  const parts = ref.split("?")[0]!.split("/");
  if (parts.length < 4) return null;
  let slug = parts[2]!;
  try {
    slug = decodeURIComponent(slug);
  } catch {
    /* keep raw */
  }
  const words = slug.replace(/-/g, " ").trim();
  if (!words) return null;
  return (words[0]!.toUpperCase() + words.slice(1)).slice(0, 200);
}

/** iframe heights that match each player's own compact layout. */
export function embedHeight(service: Exclude<MusicService, "youtube">, ref: string): number {
  if (service === "spotify")
    return ref.startsWith("track/") || ref.startsWith("episode/") ? 152 : 352;
  return ref.includes("?i=") || ref.split("/")[1] === "song" ? 175 : 450;
}

/** Extract an 11-character YouTube video id from any common URL shape. */
export function youtubeId(input: string): string | null {
  const s = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") return u.pathname.slice(1, 12).match(/^[A-Za-z0-9_-]{11}$/)?.[0] ?? null;
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      const v = u.searchParams.get("v");
      if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;
      const m = u.pathname.match(/\/(embed|shorts|live|v)\/([A-Za-z0-9_-]{11})/);
      return m?.[2] ?? null;
    }
  } catch {
    return null;
  }
  return null;
}

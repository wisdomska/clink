import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Fetch a page's preview (Open Graph / Twitter / <title>) from the server, so
 * the couple's devices never contact the site. Only public http(s) addresses:
 * anything that resolves to a private, loopback or link-local address is refused,
 * redirects are re-checked hop by hop, and sizes and time are capped.
 */
export interface Preview {
  ok: boolean;
  title: string | null;
  description: string | null;
  site: string | null;
  image: string | null;
}

const MAX_HTML = 512 * 1024;
const MAX_IMAGE = 4 * 1024 * 1024;
const TIMEOUT = 5000;
const UA = "Mozilla/5.0 (compatible; ClinkPreview/1.0; +https://clinkapp.vercel.app)";

export function privateAddress(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number) as [number, number];
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  const v = ip.toLowerCase();
  if (v.startsWith("::ffff:")) return privateAddress(v.slice(7));
  return (
    v === "::" ||
    v === "::1" ||
    v.startsWith("fc") ||
    v.startsWith("fd") ||
    v.startsWith("fe8") ||
    v.startsWith("fe9") ||
    v.startsWith("fea") ||
    v.startsWith("feb") ||
    v.startsWith("ff")
  );
}

/** A link worth previewing: http(s), default ports, a public host name. */
export function cleanUrl(raw: string): URL | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  if (u.username || u.password) return null;
  if (u.port && u.port !== "80" && u.port !== "443") return null;
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (!host.includes(".") && !isIP(host)) return null;
  if (isIP(host) && privateAddress(host)) return null;
  if (/\.(local|localhost|internal|lan|home|corp)$/i.test(host) || host === "localhost")
    return null;
  u.hash = "";
  return u;
}

async function publicHost(u: URL) {
  const host = u.hostname.replace(/^\[|\]$/g, "");
  const ips = isIP(host) ? [host] : (await lookup(host, { all: true })).map((x) => x.address);
  if (!ips.length || ips.some(privateAddress)) throw new Error("private address");
}

async function safeFetch(start: URL, accept: string): Promise<Response> {
  let url = start;
  for (let hop = 0; hop < 4; hop++) {
    await publicHost(url);
    const res = await fetch(url, {
      redirect: "manual",
      headers: { "User-Agent": UA, Accept: accept, "Accept-Language": "en" },
      signal: AbortSignal.timeout(TIMEOUT),
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      const next = cleanUrl(new URL(res.headers.get("location")!, url).toString());
      if (!next) throw new Error("bad redirect");
      url = next;
      continue;
    }
    return res;
  }
  throw new Error("too many redirects");
}

async function readCapped(res: Response, max: number): Promise<Uint8Array> {
  const len = Number(res.headers.get("content-length") ?? 0);
  if (len > max && max !== MAX_HTML) throw new Error("too large");
  const reader = res.body?.getReader();
  if (!reader) return new Uint8Array();
  const parts: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    parts.push(value);
    if (size > max) {
      await reader.cancel();
      // HTML: the head is all we need; images must be whole.
      if (max === MAX_HTML) break;
      throw new Error("too large");
    }
  }
  return Buffer.concat(parts).subarray(0, max);
}

const ENT: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
function decode(s: string) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

/** Title, description, site name and image URL from a page's <head>. */
export function parseMeta(html: string, base: URL) {
  const head = html.slice(0, MAX_HTML).split(/<\/head>/i)[0] ?? "";
  const meta = new Map<string, string>();
  for (const tag of head.match(/<meta\b[^>]*>/gi) ?? []) {
    const attr = (n: string) =>
      tag.match(new RegExp(`\\b${n}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
    const key = attr("property") ?? attr("name");
    const val = attr("content");
    if (!key || !val) continue;
    const k = (key[2] ?? key[3] ?? key[4] ?? "").toLowerCase();
    if (!meta.has(k)) meta.set(k, decode(val[2] ?? val[3] ?? val[4] ?? ""));
  }
  const titleTag = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = meta.get(k);
      if (v) return v;
    }
    return null;
  };
  const cut = (s: string | null, n: number) => (s && s.length > n ? `${s.slice(0, n - 1)}…` : s);
  let image = pick("og:image:secure_url", "og:image", "og:image:url", "twitter:image");
  try {
    image = image ? new URL(image, base).toString() : null;
  } catch {
    image = null;
  }
  return {
    title: cut(pick("og:title", "twitter:title") ?? (titleTag ? decode(titleTag) : null), 140),
    description: cut(pick("og:description", "twitter:description", "description"), 220),
    site: cut(pick("og:site_name", "application-name") ?? base.hostname.replace(/^www\./, ""), 60),
    image,
  };
}

async function thumbnail(src: string): Promise<string | null> {
  const u = cleanUrl(src);
  if (!u) return null;
  try {
    const res = await safeFetch(u, "image/*");
    if (!res.ok || !/^image\//.test(res.headers.get("content-type") ?? "")) return null;
    const buf = await readCapped(res, MAX_IMAGE);
    const { default: sharp } = await import("sharp");
    const out = await sharp(buf, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width: 480, height: 480, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 60 })
      .toBuffer();
    if (out.length > 60_000) return null;
    return `data:image/webp;base64,${out.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function fetchPreview(u: URL): Promise<Preview> {
  const none: Preview = { ok: false, title: null, description: null, site: null, image: null };
  try {
    const res = await safeFetch(u, "text/html,application/xhtml+xml");
    if (!res.ok || !/html/i.test(res.headers.get("content-type") ?? "")) return none;
    const html = new TextDecoder().decode(await readCapped(res, MAX_HTML));
    const m = parseMeta(html, new URL(res.url || u.toString()));
    if (!m.title) return none;
    return { ok: true, ...m, image: m.image ? await thumbnail(m.image) : null };
  } catch {
    return none;
  }
}

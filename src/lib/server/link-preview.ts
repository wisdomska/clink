import "server-only";
import { lookup as dnsLookup, type LookupAddress, type LookupOptions } from "node:dns";
import http from "node:http";
import https from "node:https";
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
export function cleanUrl(raw: string, opts: { anyPort?: boolean } = {}): URL | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  if (u.username || u.password) return null;
  if (u.port && u.port !== "80" && u.port !== "443" && !opts.anyPort) return null;
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (!host.includes(".") && !isIP(host)) return null;
  if (isIP(host) && privateAddress(host)) return null;
  if (/\.(local|localhost|internal|lan|home|corp)$/i.test(host) || host === "localhost")
    return null;
  u.hash = "";
  return u;
}

/**
 * Resolve a host and refuse private addresses, inside the connection itself:
 * Node connects to exactly the address this returns, so a site can't pass
 * the check with one address and then connect us to another (DNS rebinding).
 */
export function guardedLookup(
  hostname: string,
  options: LookupOptions,
  callback: (
    err: NodeJS.ErrnoException | null,
    address: string | LookupAddress[],
    family?: number,
  ) => void,
) {
  dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, "", 0);
    const list = addresses as LookupAddress[];
    if (!list.length || list.some((a) => privateAddress(a.address))) {
      const e: NodeJS.ErrnoException = new Error(`refused private address for ${hostname}`);
      e.code = "EPRIVATE";
      return callback(e, "", 0);
    }
    if (options.all) return callback(null, list);
    callback(null, list[0]!.address, list[0]!.family);
  });
}

interface Got {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  url: URL;
  body: Buffer;
}

/** One GET through the guarded lookup, with time and size caps. */
type Lookup = typeof guardedLookup;
function get(url: URL, accept: string, max: number, lookup: Lookup): Promise<Got> {
  return new Promise((resolve, reject) => {
    const host = url.hostname.replace(/^\[|\]$/g, "");
    if (lookup === guardedLookup && isIP(host) && privateAddress(host))
      return reject(new Error("private address"));
    const mod = url.protocol === "https:" ? https : http;
    const req = mod.get(
      url,
      {
        lookup: lookup as never,
        headers: { "User-Agent": UA, Accept: accept, "Accept-Language": "en" },
        timeout: TIMEOUT,
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const len = Number(res.headers["content-length"] ?? 0);
        const htmlLike = max === MAX_HTML;
        if (status >= 300 && status < 400) {
          res.resume();
          return resolve({ status, headers: res.headers, url, body: Buffer.alloc(0) });
        }
        if (len > max && !htmlLike) {
          res.destroy();
          return reject(new Error("too large"));
        }
        const parts: Buffer[] = [];
        let size = 0;
        res.on("data", (c: Buffer) => {
          size += c.length;
          parts.push(c);
          if (size > max) {
            res.destroy();
            // HTML: the head is all we need; images must be whole.
            if (htmlLike)
              resolve({
                status,
                headers: res.headers,
                url,
                body: Buffer.concat(parts).subarray(0, max),
              });
            else reject(new Error("too large"));
          }
        });
        res.on("end", () =>
          resolve({ status, headers: res.headers, url, body: Buffer.concat(parts) }),
        );
        res.on("error", reject);
      },
    );
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    // Whole request, redirects aside, never longer than the cap.
    setTimeout(() => req.destroy(new Error("timeout")), TIMEOUT).unref();
  });
}

async function safeGet(
  start: URL,
  accept: string,
  max: number,
  lookup: Lookup = guardedLookup,
): Promise<Got> {
  let url = start;
  for (let hop = 0; hop < 4; hop++) {
    const res = await get(url, accept, max, lookup);
    const loc = res.headers.location;
    if (res.status >= 300 && res.status < 400 && typeof loc === "string") {
      const next = cleanUrl(new URL(loc, url).toString(), { anyPort: lookup !== guardedLookup });
      if (!next) throw new Error("bad redirect");
      url = next;
      continue;
    }
    return res;
  }
  throw new Error("too many redirects");
}

const header = (h: Got["headers"], k: string) => {
  const v = h[k];
  return (Array.isArray(v) ? v[0] : v) ?? "";
};

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

async function thumbnail(src: string, lookup: Lookup): Promise<string | null> {
  const u = cleanUrl(src, { anyPort: lookup !== guardedLookup });
  if (!u) return null;
  try {
    const res = await safeGet(u, "image/*", MAX_IMAGE, lookup);
    if (res.status !== 200 || !/^image\//.test(header(res.headers, "content-type"))) return null;
    const buf = res.body;
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

/** `lookup` is for tests only (a local server standing in for a site). */
export async function fetchPreview(u: URL, lookup: Lookup = guardedLookup): Promise<Preview> {
  const none: Preview = { ok: false, title: null, description: null, site: null, image: null };
  try {
    const res = await safeGet(u, "text/html,application/xhtml+xml", MAX_HTML, lookup);
    if (res.status !== 200 || !/html/i.test(header(res.headers, "content-type"))) return none;
    const html = new TextDecoder().decode(res.body);
    const m = parseMeta(html, res.url);
    if (!m.title) return none;
    return { ok: true, ...m, image: m.image ? await thumbnail(m.image, lookup) : null };
  } catch {
    return none;
  }
}

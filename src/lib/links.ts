/** Web links in a message: found anywhere in the text, without trailing punctuation. */
const LINK = /\bhttps?:\/\/[^\s<>"']+/gi;

function trim(url: string) {
  let u = url.replace(/[.,!?;:]+$/, "");
  // A closing bracket only belongs to the link if it opened one.
  while (/[)\]]$/.test(u)) {
    const open = u.endsWith(")") ? "(" : "[";
    const close = u.at(-1)!;
    if (u.split(open).length >= u.split(close).length) break;
    u = u.slice(0, -1);
  }
  return u;
}

export type Part = { text: string; href?: string };

export function splitLinks(text: string): Part[] {
  const out: Part[] = [];
  let at = 0;
  for (const m of text.matchAll(LINK)) {
    const href = trim(m[0]);
    const i = m.index!;
    if (i > at) out.push({ text: text.slice(at, i) });
    out.push({ text: href, href });
    at = i + href.length;
  }
  if (at < text.length) out.push({ text: text.slice(at) });
  return out;
}

export function firstLink(text: string | null | undefined): string | null {
  if (!text) return null;
  return splitLinks(text).find((p) => p.href)?.href ?? null;
}

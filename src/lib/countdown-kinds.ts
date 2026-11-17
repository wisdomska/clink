/**
 * What a countdown can be counting to. Each kind asks for its own few details;
 * the board line under the title is built from them, so a flight reads like a
 * departure board ("ACC → LHR · BA078") and a date night reads like a plan.
 */
export const COUNTDOWN_KINDS = [
  "visit",
  "trip",
  "date",
  "anniversary",
  "birthday",
  "event",
  "other",
] as const;
export type CountdownKind = (typeof COUNTDOWN_KINDS)[number];

export interface KindField {
  key: string;
  label: string;
  placeholder: string;
  max: number;
  /** Shown in upper case on the board, like airport codes. */
  upper?: boolean;
}

export interface KindSpec {
  label: string;
  /** Suggested name when you pick it (only if you haven't typed one). */
  title: string;
  fields: KindField[];
}

export const KINDS: Record<CountdownKind, KindSpec> = {
  visit: {
    label: "Visit",
    title: "Next visit",
    fields: [
      { key: "from", label: "From", placeholder: "ACC", max: 24, upper: true },
      { key: "to", label: "To", placeholder: "LHR", max: 24, upper: true },
      { key: "ref", label: "Flight or gate", placeholder: "BA078 · Gate 2", max: 24, upper: true },
    ],
  },
  trip: {
    label: "Trip",
    title: "Our trip",
    fields: [
      { key: "where", label: "Where", placeholder: "Cape Coast", max: 40 },
      { key: "how", label: "Getting there", placeholder: "By road, 3 h", max: 30 },
    ],
  },
  date: {
    label: "Date night",
    title: "Date night",
    fields: [
      { key: "place", label: "Where", placeholder: "Skybar 25", max: 40 },
      { key: "plan", label: "The plan", placeholder: "Dinner, then dancing", max: 40 },
    ],
  },
  anniversary: {
    label: "Anniversary",
    title: "Our anniversary",
    fields: [
      { key: "what", label: "What we're marking", placeholder: "2 years together", max: 40 },
    ],
  },
  birthday: {
    label: "Birthday",
    title: "Birthday",
    fields: [{ key: "whose", label: "Whose birthday", placeholder: "Kofi", max: 30 }],
  },
  event: {
    label: "Event",
    title: "",
    fields: [{ key: "venue", label: "Where", placeholder: "Accra Sports Stadium", max: 40 }],
  },
  other: {
    label: "Something else",
    title: "",
    fields: [
      { key: "line", label: "A short line (optional)", placeholder: "Bring the good tea", max: 60 },
    ],
  },
};

export function isKind(k: unknown): k is CountdownKind {
  return typeof k === "string" && (COUNTDOWN_KINDS as readonly string[]).includes(k);
}

/** Keep only this kind's fields, trimmed and capped. */
export function cleanDetails(kind: CountdownKind, raw: Record<string, unknown>) {
  const out: Record<string, string> = {};
  for (const f of KINDS[kind].fields) {
    const v = typeof raw[f.key] === "string" ? (raw[f.key] as string).trim().slice(0, f.max) : "";
    if (v) out[f.key] = f.upper ? v.toUpperCase() : v;
  }
  return out;
}

/** The line under the title, from a kind's details (max 60 chars), or null. */
export function boardLine(kind: CountdownKind, d: Record<string, string>): string | null {
  const parts: string[] = [];
  switch (kind) {
    case "visit": {
      const route = d.from && d.to ? `${d.from} → ${d.to}` : (d.to ?? d.from ?? "");
      if (route) parts.push(route);
      if (d.ref) parts.push(d.ref);
      break;
    }
    case "trip":
      if (d.where) parts.push(d.where);
      if (d.how) parts.push(d.how);
      break;
    case "date":
      if (d.place) parts.push(d.place);
      if (d.plan) parts.push(d.plan);
      break;
    case "anniversary":
      if (d.what) parts.push(d.what);
      break;
    case "birthday":
      if (d.whose) parts.push(`${d.whose}'s birthday`);
      break;
    case "event":
      if (d.venue) parts.push(d.venue);
      break;
    case "other":
      if (d.line) parts.push(d.line);
      break;
  }
  const line = parts.join(" · ");
  return line ? line.slice(0, 60) : null;
}

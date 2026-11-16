/**
 * Avatars: the memoji cast. Ten people, twelve poses each, key
 * "m-<person>-<pose>" (e.g. "m-p10-love"), files in public/memoji (320x320,
 * transparent). Older keys (Fluent pose avatars "p-{w|m}-{pose}-{tone}" and
 * the classic faces and animals) are no longer stored, but avatarSrc() still
 * maps every one of them to a memoji so nothing ever renders the old art.
 */

/** The cast, in picker order. Descriptions double as accessible labels. */
export const PEOPLE = [
  ["p10", "Woman with curly hair and a blue cap"],
  ["p13", "Man with dark skin and spiky hair"],
  ["p03", "Woman with long auburn hair"],
  ["p12", "Man with black twists and glasses"],
  ["p15", "Woman with long black hair and red glasses"],
  ["p22", "Man with short blond hair"],
  ["p18", "Older man with grey hair and glasses"],
  ["p20", "Older woman with long grey hair"],
  ["p26", "Older man in a flat cap"],
  ["p00", "Person with silver locs and dark skin"],
] as const;

/** Who each person is for: "w" women, "m" men, "x" everyone. */
export const PERSON_GENDER: Record<string, "w" | "m" | "x"> = {
  p10: "w",
  p13: "m",
  p03: "w",
  p12: "m",
  p15: "w",
  p22: "m",
  p18: "m",
  p20: "w",
  p26: "m",
  p00: "x",
};

export type Gender = "woman" | "man" | "unspecified";
export const GENDERS: Array<[Gender, string]> = [
  ["woman", "Woman"],
  ["man", "Man"],
  ["unspecified", "Not saying"],
];

/** The people to offer someone: their gender's cast plus the neutral ones; everyone if unsaid. */
export function peopleFor(gender: Gender | null | undefined) {
  if (gender !== "woman" && gender !== "man") return PEOPLE;
  const g = gender === "woman" ? "w" : "m";
  return PEOPLE.filter(([id]) => PERSON_GENDER[id] === g || PERSON_GENDER[id] === "x");
}

export const MEMOJI_POSES = [
  ["wave", "Waving"],
  ["heart", "Heart hands"],
  ["kiss", "Blowing a kiss"],
  ["love", "Heart eyes"],
  ["laugh", "Laughing"],
  ["peace", "Peace sign"],
  ["thumbs", "Thumbs up"],
  ["shocked", "Shocked"],
  ["think", "Thinking"],
  ["sleepy", "Sleepy"],
  ["party", "Party"],
  ["idea", "Big idea"],
] as const;

export type PersonId = (typeof PEOPLE)[number][0];
export type MemojiPose = (typeof MEMOJI_POSES)[number][0];
export type AvatarKey = string;

export const DEFAULT_AVATAR = "m-p15-wave";

export const memojiKey = (person: string, pose: string) => `m-${person}-${pose}`;

const PERSON_IDS: readonly string[] = PEOPLE.map(([p]) => p);
const POSE_IDS: readonly string[] = MEMOJI_POSES.map(([p]) => p);

/** Every key that may be stored: the 120 memoji. */
export const AVATAR_KEYS = PEOPLE.flatMap(([p]) =>
  MEMOJI_POSES.map(([pose]) => memojiKey(p, pose)),
) as [string, ...string[]];

export function parseMemoji(key: string): { person: PersonId; pose: MemojiPose } | null {
  const m = /^m-(p\d\d)-([a-z]+)$/.exec(key);
  if (!m || !PERSON_IDS.includes(m[1]!) || !POSE_IDS.includes(m[2]!)) return null;
  return { person: m[1] as PersonId, pose: m[2] as MemojiPose };
}

// ---- Old keys -> memoji ---------------------------------------------------

/** Fluent pose avatars: gender + skin tone picks the person. */
const POSE_PERSON: Record<string, Record<string, PersonId>> = {
  w: { k: "p10", md: "p10", m: "p15", ml: "p15", l: "p03", d: "p03" },
  m: { k: "p13", md: "p13", m: "p22", ml: "p22", l: "p12", d: "p12" },
};

/** Fluent poses -> the closest memoji pose. */
export const LEGACY_POSE: Record<string, MemojiPose> = {
  wave: "wave",
  ok: "thumbs",
  gym: "thumbs",
  sass: "peace",
  hero: "peace",
  shrug: "think",
  facepalm: "shocked",
  dance: "party",
  run: "party",
  zen: "sleepy",
  tech: "idea",
  artist: "idea",
  singer: "laugh",
  cook: "love",
};

/** Classic faces, animals and objects: spread across the cast, fixed. */
export const LEGACY_MAP: Record<string, string> = {
  woman_light: "m-p03-love",
  woman_medium: "m-p15-love",
  woman_dark: "m-p10-love",
  curly_woman: "m-p10-laugh",
  man_light: "m-p12-love",
  man_medium: "m-p22-love",
  man_dark: "m-p13-love",
  beard: "m-p00-love",
  heart_eyes: "m-p03-love",
  sunglasses: "m-p13-peace",
  cowboy: "m-p26-thumbs",
  alien: "m-p12-shocked",
  ghost: "m-p20-shocked",
  fox: "m-p03-laugh",
  cat: "m-p15-kiss",
  dog: "m-p22-thumbs",
  panda: "m-p18-laugh",
  bear: "m-p26-laugh",
  koala: "m-p20-sleepy",
  tiger: "m-p13-party",
  rabbit: "m-p10-kiss",
  penguin: "m-p18-wave",
  unicorn: "m-p15-party",
  frog: "m-p12-laugh",
  moon: "m-p10-sleepy",
  plant: "m-p00-idea",
  coffee: "m-p22-think",
  sparkle: "m-p20-party",
};

/**
 * Any stored key (memoji, Fluent pose or classic) as a memoji key, or null
 * when it is not an avatar key at all.
 */
export function toMemoji(key: string | null | undefined): string | null {
  if (!key) return null;
  if (parseMemoji(key)) return key;
  const legacy = LEGACY_MAP[key];
  if (legacy) return legacy;
  const p = /^p-(w|m)-([a-z]+)-(d|l|ml|m|md|k)$/.exec(key);
  if (p) {
    const person = POSE_PERSON[p[1]!]![p[3]!]!;
    const pose = LEGACY_POSE[p[2]!] ?? "love";
    return memojiKey(person, pose);
  }
  return null;
}

/** Image for any key; unknown keys get the default memoji. */
export function avatarSrc(key: string | null | undefined): string {
  const m = parseMemoji(toMemoji(key) ?? DEFAULT_AVATAR)!;
  return `/memoji/${m.person}-${m.pose}.webp`;
}

/**
 * How to frame a pose inside a small circle. Wave and heart show head and
 * shoulders, idea has a bulb overhead: zoom on the face so it fills the circle.
 */
export function avatarFrame(_key?: string | null): string {
  // Show the whole memoji inside the circle: hats, hands, hearts and props
  // were getting cut off when poses were zoomed onto the face. 84% of the
  // circle keeps every one of the 120 fully inside, corners included.
  return "scale(0.84)";
}

export function avatarLabel(key: string) {
  const m = parseMemoji(toMemoji(key) ?? "");
  if (!m) return key;
  const who = PEOPLE.find(([p]) => p === m.person)![1];
  const pose = MEMOJI_POSES.find(([p]) => p === m.pose)![1];
  return `${who}, ${pose.toLowerCase()}`;
}

/** All old keys, for tests and the migration. */
export const LEGACY_KEYS = [
  ...Object.keys(LEGACY_MAP),
  ...(["w", "m"] as const).flatMap((g) =>
    Object.keys(LEGACY_POSE).flatMap((pose) =>
      ["d", "l", "ml", "m", "md", "k"].map((t) => `p-${g}-${pose}-${t}`),
    ),
  ),
];

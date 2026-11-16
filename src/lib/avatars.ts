/**
 * Avatars: the memoji cast. Eight men and eight women, sixteen poses each,
 * key "m-<person>-<pose>" (e.g. "m-w2-hearteyes"), files in public/memoji
 * (320x320, transparent). Men and women share fifteen poses; men also have a
 * fist bump, women a smile with hearts in its place.
 *
 * Older keys (the first memoji cast "m-pNN-<pose>", Fluent pose avatars
 * "p-{w|m}-{pose}-{tone}", and the classic faces and animals) are no longer
 * stored, but toMemoji() maps every one of them to the closest new avatar so
 * nothing ever renders missing art.
 */

/** The cast, in picker order. Descriptions double as accessible labels. */
export const PEOPLE = [
  ["m1", "Man with short blond hair"],
  ["m2", "Man with dark skin, spiky hair and glasses"],
  ["m3", "Man with a yellow durag and a beard"],
  ["m4", "Man with silver locs"],
  ["m5", "Man with red hair and round glasses"],
  ["m6", "Man with black twists, glasses and a blue hoodie"],
  ["m7", "Man with a moustache, beard and suit"],
  ["m8", "Man with a yellow turban and a beard"],
  ["w1", "Woman with a dark curly updo and glasses"],
  ["w2", "Woman with long black hair and red glasses"],
  ["w3", "Woman with long pink hair"],
  ["w4", "Woman with grey curls, a beanie and glasses"],
  ["w5", "Woman with big ginger curls"],
  ["w6", "Woman with a green beanie and pink glasses"],
  ["w7", "Woman with a brown bun"],
  ["w8", "Woman with a pink hijab and glasses"],
] as const;

/** Every pose, in picker order. "fist" is men's, "hearts" women's (same slot). */
export const MEMOJI_POSES = [
  ["callme", "Call me"],
  ["hearthands", "Heart hands"],
  ["wave", "Waving"],
  ["hearteyes", "Heart eyes"],
  ["sleepy", "Sleepy"],
  ["starstruck", "Star-struck"],
  ["yawn", "Yawning"],
  ["cursing", "Cursing"],
  ["thumbs", "Thumbs up"],
  ["fist", "Fist bump"],
  ["hearts", "Smiling with hearts"],
  ["please", "Please"],
  ["peace", "Peace sign"],
  ["shush", "Shush"],
  ["tongue", "Tongue out"],
  ["eyeroll", "Eye roll"],
  ["wink", "Wink"],
] as const;

export type PersonId = (typeof PEOPLE)[number][0];
export type MemojiPose = (typeof MEMOJI_POSES)[number][0];
export type AvatarKey = string;

/** Who each person is for: "w" women, "m" men. */
export const PERSON_GENDER: Record<string, "w" | "m"> = Object.fromEntries(
  PEOPLE.map(([id]) => [id, id.startsWith("w") ? "w" : "m"]),
);

export type Gender = "woman" | "man" | "unspecified";
export const GENDERS: Array<[Gender, string]> = [
  ["woman", "Woman"],
  ["man", "Man"],
  ["unspecified", "Not saying"],
];

/** The people to offer someone: their gender's cast, or everyone if unsaid. */
export function peopleFor(gender: Gender | null | undefined) {
  if (gender !== "woman" && gender !== "man") return PEOPLE;
  const g = gender === "woman" ? "w" : "m";
  return PEOPLE.filter(([id]) => PERSON_GENDER[id] === g);
}

/** A person's sixteen poses, in order. */
export function posesFor(person: string) {
  const skip = PERSON_GENDER[person] === "w" ? "fist" : "hearts";
  return MEMOJI_POSES.filter(([p]) => p !== skip);
}

export const DEFAULT_AVATAR = "m-w2-wave";

export const memojiKey = (person: string, pose: string) => `m-${person}-${pose}`;

const PERSON_IDS: readonly string[] = PEOPLE.map(([p]) => p);

/** Every key that may be stored: 16 people x 16 poses. */
export const AVATAR_KEYS = PEOPLE.flatMap(([p]) =>
  posesFor(p).map(([pose]) => memojiKey(p, pose)),
) as [string, ...string[]];

export function parseMemoji(key: string): { person: PersonId; pose: MemojiPose } | null {
  const m = /^m-([mw][1-8])-([a-z]+)$/.exec(key);
  if (!m || !PERSON_IDS.includes(m[1]!)) return null;
  if (!posesFor(m[1]!).some(([p]) => p === m[2])) return null;
  return { person: m[1] as PersonId, pose: m[2] as MemojiPose };
}

// ---- Old keys -> memoji ---------------------------------------------------

/** The first memoji cast -> the closest new person. */
const OLD_PERSON: Record<string, PersonId> = {
  p10: "w1",
  p13: "m2",
  p03: "w5",
  p12: "m6",
  p15: "w2",
  p22: "m1",
  p18: "m7",
  p20: "w4",
  p26: "m8",
  p00: "m4",
};

/** The first cast's poses -> the closest new pose (kiss depends on the person). */
const OLD_POSE: Record<string, MemojiPose> = {
  wave: "wave",
  heart: "hearthands",
  love: "hearteyes",
  laugh: "tongue",
  peace: "peace",
  thumbs: "thumbs",
  shocked: "eyeroll",
  think: "shush",
  sleepy: "sleepy",
  party: "starstruck",
  idea: "callme",
};

/** Fluent pose avatars: gender + skin tone picks the (first-cast) person. */
const POSE_PERSON: Record<string, Record<string, string>> = {
  w: { k: "p10", md: "p10", m: "p15", ml: "p15", l: "p03", d: "p03" },
  m: { k: "p13", md: "p13", m: "p22", ml: "p22", l: "p12", d: "p12" },
};

/** Fluent poses -> the closest first-cast pose. */
export const LEGACY_POSE: Record<string, string> = {
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

/** Classic faces, animals and objects -> a first-cast key, fixed. */
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

/** A first-cast key ("m-p15-kiss") as a current key. */
function fromFirstCast(key: string): string | null {
  const m = /^m-(p\d\d)-([a-z]+)$/.exec(key);
  if (!m) return null;
  const person = OLD_PERSON[m[1]!];
  if (!person) return null;
  const pose =
    m[2] === "kiss"
      ? PERSON_GENDER[person] === "w"
        ? "hearts"
        : "hearteyes"
      : (OLD_POSE[m[2]!] ?? "hearteyes");
  return memojiKey(person, pose);
}

/**
 * Any stored key (current, first cast, Fluent pose or classic) as a current
 * memoji key, or null when it is not an avatar key at all.
 */
export function toMemoji(key: string | null | undefined): string | null {
  if (!key) return null;
  if (parseMemoji(key)) return key;
  const first = fromFirstCast(key);
  if (first) return first;
  const legacy = LEGACY_MAP[key];
  if (legacy) return fromFirstCast(legacy);
  const p = /^p-(w|m)-([a-z]+)-(d|l|ml|m|md|k)$/.exec(key);
  if (p) {
    const person = POSE_PERSON[p[1]!]![p[3]!]!;
    const pose = LEGACY_POSE[p[2]!] ?? "love";
    return fromFirstCast(`m-${person}-${pose}`);
  }
  return null;
}

/** Image for any key; unknown keys get the default memoji. */
export function avatarSrc(key: string | null | undefined): string {
  const m = parseMemoji(toMemoji(key) ?? DEFAULT_AVATAR)!;
  return `/memoji/${m.person}-${m.pose}.webp`;
}

/**
 * How to frame a pose inside a small circle: show the whole memoji (hands,
 * hearts, zzz and props stay inside the circle, corners included).
 */
export function avatarFrame(_key?: string | null): string {
  return "scale(0.84)";
}

export function avatarLabel(key: string) {
  const m = parseMemoji(toMemoji(key) ?? "");
  if (!m) return key;
  const who = PEOPLE.find(([p]) => p === m.person)![1];
  const pose = MEMOJI_POSES.find(([p]) => p === m.pose)![1];
  return `${who}, ${pose.toLowerCase()}`;
}

/** Every first-cast key, for tests and the migration. */
export const FIRST_CAST_KEYS = Object.keys(OLD_PERSON).flatMap((p) =>
  [...Object.keys(OLD_POSE), "kiss"].map((pose) => `m-${p}-${pose}`),
);

/** All older keys, for tests and the migration. */
export const LEGACY_KEYS = [
  ...Object.keys(LEGACY_MAP),
  ...(["w", "m"] as const).flatMap((g) =>
    Object.keys(LEGACY_POSE).flatMap((pose) =>
      ["d", "l", "ml", "m", "md", "k"].map((t) => `p-${g}-${pose}-${t}`),
    ),
  ),
];

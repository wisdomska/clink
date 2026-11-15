/**
 * Avatars: Microsoft Fluent Emoji 3D (MIT licence).
 * - Pose avatars (the picker): woman or man, 14 poses, 6 skin tones,
 *   key "p-{w|m}-{pose}-{tone}", files in public/avatars/p.
 * - Classic faces and animals: still valid for anyone who already picked one,
 *   no longer offered.
 */
export const POSES = [
  ["wave", "waving"],
  ["ok", "OK sign"],
  ["sass", "sassy"],
  ["shrug", "shrugging"],
  ["facepalm", "facepalm"],
  ["dance", "dancing"],
  ["run", "running"],
  ["gym", "at the gym"],
  ["zen", "meditating"],
  ["tech", "at the laptop"],
  ["artist", "painting"],
  ["singer", "singing"],
  ["cook", "cooking"],
  ["hero", "superhero"],
] as const;

export const TONES = [
  ["d", "Classic", "#FFC83D"],
  ["l", "Light", "#F7D7C4"],
  ["ml", "Medium light", "#D8B094"],
  ["m", "Medium", "#BB9167"],
  ["md", "Medium dark", "#8E562E"],
  ["k", "Dark", "#613D30"],
] as const;

export type Tone = (typeof TONES)[number][0];
export const GENDERS = [
  ["w", "Woman"],
  ["m", "Man"],
] as const;

export const LEGACY = [
  ["woman_light", "Woman, light skin"],
  ["woman_medium", "Woman, medium skin"],
  ["woman_dark", "Woman, dark skin"],
  ["curly_woman", "Woman with curly hair"],
  ["man_light", "Man, light skin"],
  ["man_medium", "Man, medium skin"],
  ["man_dark", "Man, dark skin"],
  ["beard", "Person with a beard"],
  ["heart_eyes", "Heart eyes"],
  ["sunglasses", "Cool sunglasses"],
  ["cowboy", "Cowboy"],
  ["alien", "Alien"],
  ["ghost", "Ghost"],
  ["fox", "Fox"],
  ["cat", "Cat"],
  ["dog", "Dog"],
  ["panda", "Panda"],
  ["bear", "Bear"],
  ["koala", "Koala"],
  ["tiger", "Tiger"],
  ["rabbit", "Rabbit"],
  ["penguin", "Penguin"],
  ["unicorn", "Unicorn"],
  ["frog", "Frog"],
  ["moon", "Moon"],
  ["plant", "Plant"],
  ["coffee", "Coffee"],
  ["sparkle", "Sparkles"],
] as const;

export const poseKey = (g: string, pose: string, tone: string) => `p-${g}-${pose}-${tone}`;

const POSE_KEYS = GENDERS.flatMap(([g]) =>
  POSES.flatMap(([p]) => TONES.map(([t]) => poseKey(g, p, t))),
);

/** Everything still valid to store (pose avatars plus the legacy set). */
export const AVATAR_KEYS = [...POSE_KEYS, ...LEGACY.map(([k]) => k)] as [string, ...string[]];
export type AvatarKey = string;

/** Kept for older imports: the legacy list. */
export const AVATARS = LEGACY;

export function parsePose(key: string) {
  const m = /^p-(w|m)-([a-z]+)-(d|l|ml|m|md|k)$/.exec(key);
  return m ? { g: m[1]!, pose: m[2]!, tone: m[3]! } : null;
}

export const avatarSrc = (k: string) =>
  k.startsWith("p-") ? `/avatars/p/${k.slice(2)}.webp` : `/avatars/${k}.webp`;

export function avatarLabel(k: string) {
  const p = parsePose(k);
  if (p) {
    const who = GENDERS.find(([g]) => g === p.g)?.[1] ?? "Person";
    const pose = POSES.find(([x]) => x === p.pose)?.[1] ?? p.pose;
    const tone = TONES.find(([t]) => t === p.tone)?.[1] ?? "";
    return `${who} ${pose}, ${tone.toLowerCase()} skin`;
  }
  return LEGACY.find(([x]) => x === k)?.[1] ?? k;
}

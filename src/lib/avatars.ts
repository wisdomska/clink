/**
 * Default avatars: Microsoft Fluent Emoji 3D (MIT licence), saved as 192 px
 * WebP files in public/avatars by scripts/fetch-avatars.mjs. The first five
 * keys are the original icon names, so existing profiles keep their pick.
 */
export const AVATARS = [
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

export type AvatarKey = (typeof AVATARS)[number][0];
export const AVATAR_KEYS = AVATARS.map(([k]) => k) as [AvatarKey, ...AvatarKey[]];
export const avatarSrc = (k: string) => `/avatars/${k}.webp`;
export const avatarLabel = (k: string) => AVATARS.find(([x]) => x === k)?.[1] ?? k;

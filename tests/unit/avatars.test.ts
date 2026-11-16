import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  AVATAR_KEYS,
  DEFAULT_AVATAR,
  FIRST_CAST_KEYS,
  LEGACY_KEYS,
  PEOPLE,
  avatarLabel,
  avatarSrc,
  parseMemoji,
  peopleFor,
  posesFor,
  toMemoji,
} from "@/lib/avatars";
import { profileSchema } from "@/lib/validation";

const pub = path.join(process.cwd(), "public");
const file = (src: string) => path.join(pub, src);

describe("memoji avatars", () => {
  it("offers 8 men and 8 women with 16 poses each, every one with a file", () => {
    expect(PEOPLE).toHaveLength(16);
    expect(AVATAR_KEYS).toHaveLength(256);
    expect(new Set(AVATAR_KEYS).size).toBe(256);
    for (const key of AVATAR_KEYS) {
      expect(key).toMatch(/^m-[mw][1-8]-[a-z]+$/);
      expect(parseMemoji(key), key).not.toBeNull();
      const src = avatarSrc(key);
      expect(src.startsWith("/memoji/"), src).toBe(true);
      expect(existsSync(file(src)), src).toBe(true);
      expect(avatarLabel(key)).not.toBe(key);
    }
    expect(AVATAR_KEYS).toContain(DEFAULT_AVATAR);
  });

  it("gives men a fist bump and women smiling with hearts in its place", () => {
    expect(posesFor("m3").map(([p]) => p)).toContain("fist");
    expect(posesFor("m3").map(([p]) => p)).not.toContain("hearts");
    expect(posesFor("w2").map(([p]) => p)).toContain("hearts");
    expect(posesFor("w2").map(([p]) => p)).not.toContain("fist");
    expect(parseMemoji("m-w2-fist")).toBeNull();
    expect(parseMemoji("m-m3-hearts")).toBeNull();
  });

  it("shows only your cast, or everyone when you'd rather not say", () => {
    expect(peopleFor("woman").every(([id]) => id.startsWith("w"))).toBe(true);
    expect(peopleFor("woman")).toHaveLength(8);
    expect(peopleFor("man").every(([id]) => id.startsWith("m"))).toBe(true);
    expect(peopleFor("man")).toHaveLength(8);
    expect(peopleFor("unspecified")).toHaveLength(16);
    expect(peopleFor(null)).toHaveLength(16);
  });

  it("maps every older key (first cast, Fluent poses, classic faces) to a current avatar", () => {
    expect(LEGACY_KEYS.length).toBe(28 + 2 * 14 * 6);
    for (const key of [...FIRST_CAST_KEYS, ...LEGACY_KEYS]) {
      const m = toMemoji(key);
      expect(m, key).not.toBeNull();
      expect(AVATAR_KEYS, key).toContain(m);
      expect(existsSync(file(avatarSrc(key))), key).toBe(true);
    }
  });

  it("keeps people as close as possible to what they had", () => {
    // Same person in both casts.
    expect(toMemoji("m-p15-wave")).toBe("m-w2-wave");
    expect(toMemoji("m-p00-love")).toBe("m-m4-hearteyes");
    // A kiss becomes hearts for women, heart eyes for men.
    expect(toMemoji("m-p15-kiss")).toBe("m-w2-hearts");
    expect(toMemoji("m-p13-kiss")).toBe("m-m2-hearteyes");
    expect(toMemoji("woman_dark")).toBe("m-w1-hearteyes");
    expect(toMemoji("p-m-ok-md")).toBe("m-m2-thumbs");
    expect(toMemoji("nonsense")).toBeNull();
    expect(avatarSrc("nonsense")).toBe(avatarSrc(DEFAULT_AVATAR));
  });

  it("only accepts current avatar keys from clients", () => {
    const ok = (k: string) =>
      profileSchema.safeParse({ display_name: "A", avatar_icon: k }).success;
    expect(ok("m-w2-hearts")).toBe(true);
    expect(ok("m-m3-fist")).toBe(true);
    expect(ok("m-w2-fist")).toBe(false);
    expect(ok("m-p10-love")).toBe(false);
    expect(ok("cat")).toBe(false);
  });

  it("the migration maps and constrains to the same set", () => {
    const sql = readFileSync(
      path.join(process.cwd(), "supabase/migrations/20261116001300_memoji_cast_v2.sql"),
      "utf8",
    );
    for (const key of FIRST_CAST_KEYS)
      expect(sql).toContain(`when '${key}' then '${toMemoji(key)}'`);
    expect(sql).toContain(`set default '${DEFAULT_AVATAR}'`);
  });
});

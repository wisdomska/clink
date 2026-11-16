import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  AVATAR_KEYS,
  DEFAULT_AVATAR,
  LEGACY_KEYS,
  MEMOJI_POSES,
  PEOPLE,
  avatarLabel,
  avatarSrc,
  parseMemoji,
  toMemoji,
} from "@/lib/avatars";
import { profileSchema } from "@/lib/validation";

const pub = path.join(process.cwd(), "public");
const file = (src: string) => path.join(pub, src);

describe("memoji avatars", () => {
  it("offers 10 people x 12 poses, each with a file", () => {
    expect(PEOPLE).toHaveLength(10);
    expect(MEMOJI_POSES).toHaveLength(12);
    expect(AVATAR_KEYS).toHaveLength(120);
    expect(new Set(AVATAR_KEYS).size).toBe(120);
    for (const key of AVATAR_KEYS) {
      expect(key).toMatch(/^m-p\d\d-[a-z]+$/);
      expect(parseMemoji(key), key).not.toBeNull();
      const src = avatarSrc(key);
      expect(src.startsWith("/memoji/"), src).toBe(true);
      expect(existsSync(file(src)), src).toBe(true);
      expect(avatarLabel(key)).not.toBe(key);
    }
    expect(AVATAR_KEYS).toContain(DEFAULT_AVATAR);
  });

  it("maps every old key (Fluent poses, classic faces, animals) to an existing memoji", () => {
    expect(LEGACY_KEYS.length).toBe(28 + 2 * 14 * 6);
    for (const key of LEGACY_KEYS) {
      const m = toMemoji(key);
      expect(m, key).not.toBeNull();
      expect(AVATAR_KEYS, key).toContain(m);
      const src = avatarSrc(key);
      expect(src.startsWith("/memoji/"), `${key} -> ${src}`).toBe(true);
      expect(existsSync(file(src)), `${key} -> ${src}`).toBe(true);
    }
  });

  it("keeps the mapping people asked for", () => {
    expect(toMemoji("woman_dark")).toBe("m-p10-love");
    expect(toMemoji("man_dark")).toBe("m-p13-love");
    expect(toMemoji("p-w-wave-k")).toBe("m-p10-wave");
    expect(toMemoji("p-m-ok-md")).toBe("m-p13-thumbs");
    expect(toMemoji("p-w-singer-l")).toBe("m-p03-laugh");
    expect(toMemoji("nonsense")).toBeNull();
    expect(avatarSrc("nonsense")).toBe(avatarSrc(DEFAULT_AVATAR));
  });

  it("only accepts memoji keys from clients", () => {
    expect(profileSchema.safeParse({ display_name: "A", avatar_icon: "m-p10-love" }).success).toBe(
      true,
    );
    expect(profileSchema.safeParse({ display_name: "A", avatar_icon: "p-w-wave-m" }).success).toBe(
      false,
    );
    expect(profileSchema.safeParse({ display_name: "A", avatar_icon: "cat" }).success).toBe(false);
  });

  it("migration maps and constrains to the same set", () => {
    const sql = readFileSync(
      path.join(process.cwd(), "supabase/migrations/20261116001000_memoji_avatars.sql"),
      "utf8",
    );
    for (const key of LEGACY_KEYS.filter((k) => !k.startsWith("p-"))) {
      expect(sql).toContain(`when avatar_icon = '${key}' then '${toMemoji(key)}'`);
    }
    for (const [id] of PEOPLE) expect(sql).toContain(id);
    for (const [pose] of MEMOJI_POSES) expect(sql).toContain(pose);
    expect(sql).toContain(`set default '${DEFAULT_AVATAR}'`);
  });
});

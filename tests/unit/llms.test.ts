import { describe, it, expect } from "vitest";
import { llmsTxt, llmsFullTxt } from "@/lib/llms";
import { PUBLIC_GAMES } from "@/lib/public-games";
import { GUIDES } from "@/lib/guides";

describe("llms.txt and llms-full.txt", () => {
  const short = llmsTxt();
  const full = llmsFullTxt();
  it("follow the llmstxt.org shape: a title, a summary quote, then sections", () => {
    expect(short.startsWith("# Clink\n\n> ")).toBe(true);
    expect(short).toContain("## Games");
    expect(short).toContain("## Guides");
    expect(short).toContain("/llms-full.txt");
  });
  it("list every game and guide, with the full text in the long version", () => {
    for (const g of PUBLIC_GAMES) {
      expect(short).toContain(`/games/${g.slug})`);
      expect(full).toContain(`## ${g.name}`);
      for (const s of g.steps) expect(full).toContain(s);
    }
    for (const g of GUIDES) {
      expect(short).toContain(`/guides/${g.slug})`);
      expect(full).toContain(g.answer);
    }
  });
  it("never mention private screens, and keep the house style", () => {
    for (const t of [short, full]) {
      expect(t).not.toMatch(/—/);
      expect(t).not.toMatch(/\/(admin|dark|api)\b/);
      expect(t).toContain("18+");
    }
  });
});

import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";

let words: Set<string> | null = null;

/** English word list (sindresorhus/word-list, MIT), loaded once per server instance. */
export function isWord(w: string): boolean {
  if (!words) {
    const file = join(process.cwd(), "node_modules", "word-list", "words.txt");
    words = new Set(readFileSync(file, "utf8").split("\n"));
  }
  return words.has(w.toLowerCase());
}

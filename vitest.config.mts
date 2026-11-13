import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: [
        "src/lib/time.ts",
        "src/lib/age.ts",
        "src/lib/push-copy.ts",
        "src/lib/analytics-events.ts",
        "src/lib/media-rules.ts",
        "src/features/play/engines/**",
        "src/lib/dark-logic.ts",
        "src/lib/challenges.ts",
        "src/lib/youtube.ts",
        "src/features/plans/youtube-player.ts",
      ],
      thresholds: { lines: 80, functions: 80, branches: 75, statements: 80 },
      reporter: ["text-summary", "json-summary"],
    },
  },
});

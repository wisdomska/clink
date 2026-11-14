import next from "eslint-config-next";

const config = [
  {
    ignores: [
      "design/**",
      ".next/**",
      "public/sw.js",
      "coverage/**",
      "playwright-report/**",
      "supabase/functions/**",
    ],
  },
  ...next,
  {
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }],
      // Deliberate: after sign-out, unlink, delete and lock we hard-navigate so no
      // private client state (query caches, object URLs) survives in memory.
      "@next/next/no-location-assign-relative-destination": "off",
    },
  },
  {
    files: ["tests/**", "scripts/**"],
    rules: { "react-hooks/rules-of-hooks": "off" },
  },
  {
    // Command-line scripts report progress on stdout.
    files: ["scripts/**"],
    rules: { "no-console": "off" },
  },
];
export default config;

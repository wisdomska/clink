import next from "eslint-config-next";

const config = [
  { ignores: ["design/**", ".next/**", "public/sw.js", "coverage/**", "playwright-report/**", "supabase/functions/**"] },
  ...next,
  {
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
];
export default config;

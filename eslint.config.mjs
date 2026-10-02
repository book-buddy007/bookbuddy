// ESLint for the Next.js app (the backend and Expo app have their own configs:
// backend/eslint.config.mjs and `expo lint` in mobile/).
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "backend/**",
      "mobile/**",
      "public/**",
      "coverage/**",
      "cypress/**",
      "scripts/**",
      "next-env.d.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // ~400 existing `any`s: reported so they can be typed over time, but not blocking.
      "@typescript-eslint/no-explicit-any": "warn",
      // `_`-prefixed names are intentionally unused; unused catch bindings are fine.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none", ignoreRestSiblings: true },
      ],
    },
  },
  {
    // Config files run under Node's CommonJS loader.
    files: ["tailwind.config.ts", "*.config.{js,mjs,cjs,ts}"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
];

export default config;

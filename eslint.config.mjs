import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Contains no lintable files (only .md/.sql/.pdf); one subfolder is permission-restricted
    // (docs/migration-evidence/private/), which otherwise crashes the directory scan with EPERM.
    "docs/**",
  ]),
]);

export default eslintConfig;

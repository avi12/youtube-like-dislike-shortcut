import eslint from "@eslint/js";
import avi12 from "eslint-config-avi12";
import perfectionist from "eslint-plugin-perfectionist";
import svelteEslint from "eslint-plugin-svelte";
import { globalIgnores } from "eslint/config";
import globals from "globals";
import svelteParser from "svelte-eslint-parser";
import tsEslint from "typescript-eslint";

export default [
  globalIgnores([".wxt/**", "build/**"]),
  eslint.configs.recommended,
  ...tsEslint.configs.recommended,
  ...svelteEslint.configs["flat/recommended"],
  ...avi12,
  {
    files: ["**/*.svelte"],
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: tsEslint.parser
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        chrome: true
      }
    }
  },
  {
    files: ["**/*.{ts,js}"],
    plugins: {
      perfectionist
    },
    languageOptions: {
      parser: tsEslint.parser,
      globals: {
        ...globals.browser,
        ...globals.node,
        chrome: true
      }
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "never" }],
      "id-length": ["error", { min: 3, exceptions: ["_", "e", "i", "j", "k", "x", "y", "z", "id"] }],
      "import/order": "off",
      "perfectionist/sort-imports": ["warn", { internalPattern: ["^@/"] }]
    }
  }
];

import eslint from "@eslint/js";
import avi12 from "eslint-config-avi12";
import importNewlines from "eslint-plugin-import-newlines";
import perfectionist from "eslint-plugin-perfectionist";
import svelteEslint from "eslint-plugin-svelte";
import { globalIgnores } from "eslint/config";
import globals from "globals";
import svelteParser from "svelte-eslint-parser";
import tsEslint from "typescript-eslint";

export default [
  globalIgnores([".wxt/**", "build/**", "user-data/**"]),
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
        chrome: true
      }
    },
    rules: {
      "prefer-const": ["error", { destructuring: "all" }]
    }
  },
  {
    files: ["src/**/*.{ts,js}"],
    languageOptions: {
      parser: tsEslint.parser,
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.*"]
        }
      },
      globals: {
        ...globals.browser,
        chrome: true
      }
    }
  },
  {
    files: ["**/*.{ts,js}"],
    ignores: ["src/**"],
    languageOptions: {
      parser: tsEslint.parser,
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.*"]
        }
      },
      globals: {
        ...globals.node
      }
    }
  },
  {
    files: ["**/*.{ts,js}"],
    plugins: {
      "import-newlines": importNewlines,
      perfectionist
    },
    rules: {
      "@stylistic/linebreak-style": ["error", "unix"],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "never" }],
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports", fixStyle: "inline-type-imports" }],
      "@typescript-eslint/no-floating-promises": "error",
      "id-length": ["error", { min: 3, exceptions: ["_", "e"], properties: "never" }],
      "import-newlines/enforce": ["error", { items: 4, "max-len": 120, forceSingleLine: true }],
      "import/order": "off",
      "perfectionist/sort-imports": ["error", { internalPattern: ["^@/"], newlinesBetween: 0 }]
    }
  }
];

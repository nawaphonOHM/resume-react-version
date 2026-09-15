import eslintJs from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";
import eslintReact from "@eslint-react/eslint-plugin";

export default defineConfig([
  {
    ignores: ["dist/**"],
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    extends: [
      eslintJs.configs.recommended,
      tseslint.configs.strictTypeChecked,
      eslintReact.configs["strict-type-checked"],
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.js"],
        },
      },
    },
    rules: {
      "block-scoped-var": "error",
      complexity: ["error", 7],
      "default-case": "error",
      "default-case-last": "error",
      "func-names": ["error", "as-needed"],
      "grouped-accessor-pairs": [
        "error",
        "anyOrder",
        { enforceForTSTypes: true },
      ],
      "guard-for-in": "error",
      "max-depth": ["error", 4],
      "max-lines": [
        "error",
        { max: 400, skipComments: true, skipBlankLines: true },
      ],
      "max-params": ["error", 3],
      "max-statements": ["error", 10],
      "new-cap": "error",
      "no-alert": "error",
      "no-bitwise": "error",
      "no-caller": "error",
      "no-eq-null": "error",
      "no-eval": "error",
      "no-extend-native": "error",
      "no-implicit-globals": "error",
      "no-implied-eval": "error",
      "no-invalid-this": "error",
      "no-iterator": "error",
      "no-lone-blocks": "error",
      "no-loop-func": "error",
      "no-multi-assign": "error",
      "no-new": "error",
      "no-new-func": "error",
      "no-new-wrappers": "error",
      "no-octal-escape": "error",
      "no-param-reassign": "error",
      "no-proto": "error",
    },
  },
]);

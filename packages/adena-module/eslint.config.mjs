import eslint from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import tseslint from "typescript-eslint";

export default tseslint.config([
  {
    name: "app/files-to-lint",
    files: ["**/*.{ts,mts,tsx,js,mjs}", "eslint.config.mjs"],
  },
  {
    name: "app/files-to-ignore",
    ignores: ["**/lib/**", "**/dist-ssr/**", "**/dist/**", "**/build/**", "**/coverage/**"],
  },
  {
    plugins: {
      "@stylistic": stylistic,
    },
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  stylistic.configs.customize({
    indent: 2,
    quotes: "single",
    semi: false,
    commaDangle: "always-multiline",
    braceStyle: "1tbs",
    blockSpacing: true,
    quoteProps: "as-needed",
  }),
  {
    rules: {
      "@stylistic/array-element-newline": [
        "error",
        {
          multiline: true,
        },
      ],
      "@stylistic/array-bracket-newline": [
        "error",
        {
          multiline: true,
        },
      ],
      "@stylistic/object-curly-newline": ["error", "always"],
      "@stylistic/object-curly-spacing": ["error", "always"],
      "@stylistic/object-property-newline": "error",
      "@typescript-eslint/no-unused-vars": [
        "error", // or "error"
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "max-lines": [
        "warn",
        {
          max: 700,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
      "max-lines-per-function": [
        "warn",
        {
          max: 500,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
    },
  },
  {
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
    },
  },
  {
    ignores: ["node_modules/*", "dist/*"],
  },
],
);

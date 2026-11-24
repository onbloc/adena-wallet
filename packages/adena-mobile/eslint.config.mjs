// Mirrors packages/adena-extension/eslint.config.mjs; mobile-only additions are marked below.
import eslint from '@eslint/js';
import eslintReact from '@eslint-react/eslint-plugin';
import stylistic from '@stylistic/eslint-plugin';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import tseslint from 'typescript-eslint';

export default tseslint.config([
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,js,mjs,jsx}'],
  },
  {
    name: 'app/files-to-ignore',
    ignores: ['**/dist/**', '**/storybook-static/**', '**/build/**', '**/coverage/**', '**/node_modules/**', 'android/**', 'ios/**', 'vendor/**'],
  },
  {
    plugins: {
      '@stylistic': stylistic,
    },
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  stylistic.configs.customize({
    semi: true,
  }),
  {
    files: ['**/*.{ts,tsx}'],
    ...eslintReact.configs['recommended-typescript'],
    rules: {
      ...eslintReact.configs['recommended-typescript'].rules,
      '@eslint-react/rules-of-hooks': 'warn',
      '@eslint-react/exhaustive-deps': 'warn',
    },
  },
  {
    rules: {
      '@stylistic/object-curly-newline': ['error', { multiline: true, consistent: true }],
      '@stylistic/object-property-newline': ['error', { allowAllPropertiesOnSameLine: true }],
      '@stylistic/quote-props': ['error', 'as-needed'],
      '@stylistic/jsx-quotes': ['error', 'prefer-single'],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
      'no-useless-assignment': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'max-lines': [
        'warn',
        {
          max: 700,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
      'max-lines-per-function': [
        'warn',
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
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },
  {
    // Node scripts run outside the app.
    files: ['scripts/**/*.mjs', 'e2e/**/*.mjs'],
    languageOptions: { globals: { process: 'readonly', console: 'readonly', setTimeout: 'readonly', Buffer: 'readonly', URL: 'readonly' } },
  },
  // Mobile only: test fixtures keep inferred types; JS files cannot carry return types.
  {
    files: ['__tests__/**/*.{ts,tsx}', '**/*.{js,mjs}'],
    rules: { '@typescript-eslint/explicit-function-return-type': 'off' },
  },
  // Mobile only: wsl-style breathing room around blocks and declarations.
  {
    rules: {
      '@stylistic/padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: ['if', 'for', 'while', 'do', 'switch', 'try'] },
        { blankLine: 'always', prev: ['if', 'for', 'while', 'do', 'switch', 'try', 'block-like'], next: '*' },
        { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
        { blankLine: 'any', prev: ['const', 'let', 'var'], next: ['const', 'let', 'var'] },
        { blankLine: 'always', prev: 'directive', next: '*' },
        { blankLine: 'always', prev: '*', next: ['export'] },
        { blankLine: 'any', prev: 'export', next: 'export' },
        { blankLine: 'always', prev: 'import', next: '*' },
        { blankLine: 'any', prev: 'import', next: 'import' },
      ],
    },
  },
  // Mobile only: UI components receive data and callbacks through props, never layers below.
  {
    files: ['src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['**/services/*', '**/repositories/**', '**/di/*', '**/stores/*', '**/queries/*', '**/security/*', '**/storage/*'],
          message: 'UI components receive data and callbacks through props only.',
        }],
      }],
    },
  },
  // Mobile only: React Native tooling configs (metro, babel, jest) are CommonJS.
  {
    files: ['**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { module: 'writable', require: 'readonly', __dirname: 'readonly', globalThis: 'readonly', jest: 'readonly' },
    },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
]);

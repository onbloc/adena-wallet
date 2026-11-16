// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import eslint from '@eslint/js';
import eslintReact from '@eslint-react/eslint-plugin';
import stylistic from '@stylistic/eslint-plugin';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import storybook from 'eslint-plugin-storybook';
import tseslint from 'typescript-eslint';

export default tseslint.config([
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,js,mjs,jsx}'],
  },
  {
    name: 'app/files-to-ignore',
    ignores: ['**/dist/**', '**/dist-firefox/**', '**/storybook-static/**', '**/build/**', '**/coverage/**', '**/public/**', '**/libs/**', '**/*.stories.*', '.storybook/**', 'manifest*.json'],
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
      '@eslint-react/dom-no-unknown-property': 'error',
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
], storybook.configs['flat/recommended']);

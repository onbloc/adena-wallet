import eslint from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import tseslint from 'typescript-eslint';

export default tseslint.config([
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,js,mjs,jsx}'],
  },
  {
    name: 'app/files-to-ignore',
    ignores: ['**/dist/**', '**/build/**', '**/coverage/**', '**/public/**', '**/libs/**', '**/*.stories.*', '.storybook/**', 'svgTransformer.js', 'jest.config.js', 'jest.setup.js'],
  },
  {
    plugins: {
      '@stylistic': stylistic,
    },
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  stylistic.configs.customize(),
  {
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      'react-hooks/rules-of-hooks': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
    },
  },
  {
    rules: {
      '@stylistic/array-element-newline': [
        'error',
        {
          multiline: true,
        },
      ],
      '@stylistic/array-bracket-newline': [
        'error',
        {
          multiline: true,
        },
      ],
      '@stylistic/object-curly-newline': ['error', 'always'],
      '@stylistic/object-curly-spacing': ['error', 'always'],
      '@stylistic/object-property-newline': 'error',
      '@stylistic/indent': ['error', 2],
      '@stylistic/quote-props': ['error', 'as-needed'],
      '@stylistic/block-spacing': ['error', 'always'],
      '@stylistic/semi': ['error', 'always'],
      '@stylistic/quotes': ['error', 'single'],
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
]);

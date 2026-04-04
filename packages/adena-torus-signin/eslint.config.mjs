import eslint from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import tseslint from 'typescript-eslint';

export default tseslint.config([
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,js,mjs}', 'eslint.config.mjs']
  },
  {
    name: 'app/files-to-ignore',
    ignores: ['**/lib/**', '**/dist-ssr/**', '**/dist/**', '**/build/**', '**/coverage/**']
  },
  {
    plugins: {
      '@stylistic': stylistic
    }
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  stylistic.configs.customize({
    semi: true
  }),
  {
    rules: {
      '@stylistic/comma-dangle': ['error', 'never'],
      '@stylistic/object-curly-newline': ['error', { multiline: true, consistent: true }],
      '@stylistic/object-property-newline': ['error', { allowAllPropertiesOnSameLine: true }],
      '@stylistic/quote-props': ['error', 'as-needed'],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ],
      'max-lines': [
        'warn',
        {
          max: 700,
          skipBlankLines: true,
          skipComments: true
        }
      ],
      'max-lines-per-function': [
        'warn',
        {
          max: 500,
          skipBlankLines: true,
          skipComments: true
        }
      ]
    }
  },
  {
    plugins: {
      'simple-import-sort': simpleImportSort
    },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error'
    }
  },
  {
    ignores: ['node_modules/*', 'dist/*']
  }
]
);

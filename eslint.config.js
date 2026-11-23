// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // `const ToolName = {...} as const; type ToolName = ...` is the enum-like
    // pattern used for constants. tsc still rejects real redeclarations.
    rules: { '@typescript-eslint/no-redeclare': 'off' },
  },
  {
    // eslint-plugin-import ignores package.json `exports`, so it cannot resolve the
    // SDK's wildcard subpaths (e.g. `client/index.js`). tsc resolves them correctly.
    rules: { 'import/no-unresolved': ['error', { ignore: ['^@modelcontextprotocol/sdk/'] }] },
  },
]);

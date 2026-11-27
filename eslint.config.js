// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

/** A path and every file below it, whatever the number of `../` in front. */
const ban = (...names) => names.flatMap((name) => [`**/${name}`, `**/${name}/**`]);

/**
 * Each module is imported through its index, not through its inner files. Only the files one
 * level down are matched, so a module's `testing/` helpers stay importable by tests.
 */
const deepImports = [
  [
    ['**/agent/*', '**/agent/wallet/*', '**/llm/core/*', '**/llm/remote/*', '**/llm/device/*', '**/harness/core/*', '**/harness/mcp/*', '!**/testing'],
    'Import a module through its index (e.g. ../agent), not its inner files.',
  ],
];

/** `no-restricted-imports`: the deep-import rule plus one group per [paths, message] pair. */
const restrict = (...groups) => ({
  'no-restricted-imports': [
    'error',
    { patterns: [...deepImports, ...groups].map(([group, message]) => ({ group, message })) },
  ],
});

const llmBan = [ban('harness', 'agent', 'mock'), 'llm must not depend on harness, agent or mock.'];
const harnessBan = [ban('llm', 'agent', 'mock'), 'harness must not depend on llm, agent or mock.'];

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/**'],
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
  // Libraries use public module indexes; the mock app consumes them as a testbed.
  //   mock -> agent, llm, harness     agent -> llm/core, harness
  //   nothing outside src/mock imports it, tests included; each library tests itself with its
  //   own fakes (agent/testing, harness/mcp/testing)
  { files: ['src/**', 'App.tsx'], rules: restrict() },
  { files: ['src/llm/**'], rules: restrict(llmBan) },
  {
    // The portable core: no device runtime, no React Native.
    files: ['src/llm/core/**'],
    rules: restrict(
      llmBan,
      [ban('device'), 'llm/core must not depend on llm/device.'],
      [['react', 'react-native', '@react-native-ai/*', 'llama.rn'], 'llm/core must run without React Native.']
    ),
  },
  {
    files: ['src/llm/remote/**', 'src/index.ts'],
    rules: restrict(
      [ban('device', 'mock'), 'Browser entries must not depend on native or mock modules.'],
      [['react', 'react-native', '@react-native-ai/*', 'llama.rn'], 'Browser entries must not import native dependencies.']
    ),
  },
  {
    files: ['src/llm/device/**'],
    rules: restrict(llmBan, [['../core/**'], 'Import llm/core through its index (../core).']),
  },
  { files: ['src/harness/**'], rules: restrict(harnessBan) },
  {
    files: ['src/harness/core/**'],
    rules: restrict(harnessBan, [ban('mcp'), 'harness/core must not depend on its plugins (harness/mcp).']),
  },
  {
    files: ['src/harness/mcp/**'],
    rules: restrict(harnessBan, [['../core/**'], 'Import harness/core through its index (../core).']),
  },
  {
    files: ['src/agent/**'],
    rules: restrict([[...ban('mock'), ...ban('device')], 'agent must not depend on the mock or the on-device runtime.']),
  },
]);

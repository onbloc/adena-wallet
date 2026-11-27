// Scenario tests talk to a real model server, so they need Node's own `fetch`. The jest-expo
// preset's setup files replace it with a stub; everything else (transforms, resolver) is kept.
const { setupFiles, testEnvironment, ...preset } = require('jest-expo/jest-preset');
const { jest: base } = require('./package.json');

module.exports = {
  ...preset,
  transformIgnorePatterns: base.transformIgnorePatterns,
  moduleNameMapper: base.moduleNameMapper,
  testEnvironment: 'node',
  testMatch: ['**/*.scenario.ts'],
  globals: { __DEV__: false },
};

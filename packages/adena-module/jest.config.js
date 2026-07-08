module.exports = {
  roots: ["<rootDir>"],
  testEnvironment: "node",
  moduleFileExtensions: ['js', 'json', 'jsx', 'ts', 'tsx', 'json'],
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  testEnvironment: 'node',
  rootDir: '.',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['<rootDir>/**/*.spec.(js|jsx|ts|tsx)'],
  transformIgnorePatterns: [
    '/node_modules/(?!(@cosmjs/(amino|crypto|encoding)|@gnolang/(gno-js-client|tm2-js-client|tm2-rpc)|@noble/(curves|hashes)|@scure/base|uuid)/)',
  ],
  setupFiles: ['<rootDir>/.jest/environment.js'],
};

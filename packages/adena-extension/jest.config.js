const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig');

const jestConfig = {
  roots: ['<rootDir>'],
  modulePaths: [compilerOptions.baseUrl],
  transform: {
    '\\.[jt]sx?$': [
      'babel-jest',
      {
        sourceType: 'unambiguous',
        presets: [
          [
            '@babel/preset-env',
            {
              targets: {
                node: 'current',
              },
            },
          ],
          '@babel/preset-typescript',
          [
            '@babel/preset-react',
            {
              runtime: 'automatic',
            },
          ],
        ],
      },
    ],
    '\\.(svg)$': '<rootDir>/svgTransformer.js',
  },
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
    prefix: '<rootDir>/',
  }),
  transformIgnorePatterns: [
    '/node_modules/(?!(@cosmjs/(amino|crypto|encoding|math|utils)|@gnolang/(gno-js-client|tm2-js-client|tm2-rpc)|@noble/(ciphers|curves|hashes)|@scure/(base|bip39)|uuid)/)',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
};

module.exports = jestConfig;

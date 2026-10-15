const path = require('path');

const extensionSrc = path.resolve(__dirname, '../adena-extension/src');

module.exports = {
  preset: 'react-native',
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^adena-module$': '<rootDir>/../adena-module/index.ts',
    '^@common/(.*)$': `${extensionSrc}/common/$1`,
    '^@inject/(.*)$': `${extensionSrc}/inject/$1`,
    '^@services/(.*)$': `${extensionSrc}/services/$1`,
    '^@repositories/(.*)$': `${extensionSrc}/repositories/$1`,
    '^@migrates/(.*)$': `${extensionSrc}/migrates/$1`,
    '^@resources/(.*)$': `${extensionSrc}/resources/$1`,
    '^@states$': `${extensionSrc}/states`,
    '^@styles/tokens$': `${extensionSrc}/styles/tokens`,
    '\\.svg$': '<rootDir>/__mocks__/svg.tsx',
    '^@assets/(.*)$': `${extensionSrc}/assets/$1`,
    '^react-native-libsodium$': '<rootDir>/__mocks__/react-native-libsodium.ts',
    // One libsodium.js copy in tests: the workspace root's, which the extension uses.
    '^libsodium-wrappers-sumo$': path.resolve(
      __dirname,
      '../../node_modules/libsodium-wrappers-sumo',
    ),
    '^react-native-keychain$': '<rootDir>/__mocks__/react-native-keychain.ts',
    'provider/generated/provider-bundle$': '<rootDir>/__mocks__/provider-bundle.js',
    '^@types$': `${extensionSrc}/types`,
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-native-clipboard|@react-navigation|react-native-[a-z-]+|lottie-react-native|@cosmjs|@gnolang|@noble|@scure|uuid)/)',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/ios/', '/android/'],
};

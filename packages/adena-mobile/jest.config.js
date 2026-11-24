// ESM-only dependencies (noble, scure, cosmjs, gnolang) must be transformed by babel-jest.
const ESM_PACKAGES = [
  '(jest-)?react-native',
  '@react-native(-community)?',
  '@react-navigation',
  '@noble',
  '@scure',
  '@cosmjs',
  '@gnolang',
  '@bufbuild',
  'lucide-react-native',
  'react-native-.*',
  'uuid',
  '@storybook',
  'storybook',
].join('|');

module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.js'],
  testMatch: ['<rootDir>/__tests__/**/*.test.ts?(x)'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.stories.tsx', '!src/**/*.d.ts', '!src/**/index.ts'],
  // adena-module/dist is already compiled CJS; transforming it would inject @babel/runtime helpers it cannot resolve.
  transformIgnorePatterns: [`node_modules/(?!(\\.pnpm/[^/]+/node_modules/)?(${ESM_PACKAGES})/)`, '/adena-module/dist/'],
  moduleNameMapper: {
    '^react-native-mmkv$': '<rootDir>/__tests__/mocks/react-native-mmkv.ts',
    '^react-native-vision-camera$': '<rootDir>/__tests__/mocks/react-native-vision-camera.tsx',
    '^react-native-vision-camera-barcode-scanner$': '<rootDir>/__tests__/mocks/react-native-vision-camera-barcode-scanner.ts',
    '^storybook/test$': '<rootDir>/__tests__/mocks/storybook-test.ts',
    '\\.svg$': '<rootDir>/__tests__/mocks/svg.tsx',
    '\\.(jpg|png)$': '<rootDir>/__tests__/mocks/image.ts',
  },
};

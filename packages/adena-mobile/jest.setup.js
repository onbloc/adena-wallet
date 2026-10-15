// libsodium.js (used by the react-native-libsodium test stand-in) seeds itself
// from Web Crypto at load time; the react-native preset leaves `crypto` unset.
if (
  !globalThis.crypto ||
  typeof globalThis.crypto.getRandomValues !== 'function'
) {
  Object.defineProperty(globalThis, 'crypto', {
    value: require('crypto').webcrypto,
    configurable: true,
    writable: true,
  });
}

jest.mock('./src/security/native-security', () => ({
  acquireSecureScreen: jest.fn(() => () => undefined),
  getProtectedStorageDirectory: jest.fn(async () => '/protected'),
  onScreenshotTaken: jest.fn(() => () => undefined),
}));

jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

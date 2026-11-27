const { webcrypto } = require('crypto');
const { TextDecoder, TextEncoder } = require('util');

if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

if (!globalThis.crypto.getRandomValues) {
  globalThis.crypto.getRandomValues = webcrypto.getRandomValues.bind(webcrypto);
}

globalThis.TextEncoder = globalThis.TextEncoder || TextEncoder;
globalThis.TextDecoder = globalThis.TextDecoder || TextDecoder;

jest.mock('react-native-keychain', () => ({}));
jest.mock('@react-native-clipboard/clipboard', () => ({ setString: jest.fn(), getString: jest.fn(async () => '') }));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-haptic-feedback', () => ({ trigger: jest.fn() }));
jest.mock('react-native-image-picker', () => ({ launchImageLibrary: jest.fn(), launchCamera: jest.fn() }));
// No Firebase app in tests: push resolves to unavailable.
jest.mock('@react-native-firebase/app', () => ({ getApps: () => [] }));
jest.mock('@react-native-firebase/messaging', () => ({ AuthorizationStatus: { NOT_DETERMINED: -1, DENIED: 0, AUTHORIZED: 1, PROVISIONAL: 2, EPHEMERAL: 3 } }));

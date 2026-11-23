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
jest.mock('@react-native-clipboard/clipboard', () => ({ setString: jest.fn() }));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

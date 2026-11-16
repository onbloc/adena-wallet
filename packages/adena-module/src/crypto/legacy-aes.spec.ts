import CryptoJS from 'crypto-js';

import { toHex } from '../encoding';
import { legacyAesDecrypt, legacyAesEncrypt, sha256Hex } from './legacy-aes';
import { Random } from './random';

// crypto-js wrote the data this module must keep reading, so it stays as the
// reference implementation for these tests.

const PASSPHRASE = 'c3f1a9e2b47d6085e1f2a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f8';

const SAMPLES = [
  '',
  'a',
  'hello world',
  '{"accounts":[{"id":"1","name":"Account 1"}],"keyrings":[]}',
  '한글 지갑 🔐 émoji',
  `${String.fromCharCode(0xfeff)}leading byte order mark`,
  'x'.repeat(16),
  JSON.stringify({ mnemonic: 'abandon '.repeat(23) + 'art', nested: { list: [1, 2, 3] } })
];

const cryptoJsDecrypt = (encrypted: string, passphrase: string): string =>
  CryptoJS.AES.decrypt(encrypted, passphrase).toString(CryptoJS.enc.Utf8);

const outcome = (run: () => string): string => {
  try {
    return `value:${run()}`;
  }
  catch (error) {
    return `throw:${(error as Error).message}`;
  }
};

describe('legacy AES (CryptoJS format)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(SAMPLES)('hashes %j like CryptoJS.SHA256', (text) => {
    expect(sha256Hex(text)).toBe(CryptoJS.SHA256(text).toString());
  });

  it.each(SAMPLES)('encrypts %j to the same bytes as CryptoJS for the same salt', (text) => {
    const salt = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    vi.spyOn(Random, 'getBytes').mockReturnValue(salt);

    const expected = CryptoJS.AES.encrypt(text, PASSPHRASE, {
      salt: CryptoJS.enc.Hex.parse(toHex(salt))
    } as unknown as CryptoJS.lib.CipherCfg).toString();

    expect(legacyAesEncrypt(text, PASSPHRASE)).toBe(expected);
  });

  it.each(SAMPLES)('decrypts what CryptoJS encrypted: %j', (text) => {
    const encrypted = CryptoJS.AES.encrypt(text, PASSPHRASE).toString();

    expect(legacyAesDecrypt(encrypted, PASSPHRASE)).toBe(text);
  });

  it.each(SAMPLES)('writes what CryptoJS decrypts: %j', (text) => {
    expect(cryptoJsDecrypt(legacyAesEncrypt(text, PASSPHRASE), PASSPHRASE)).toBe(text);
  });

  // Migrations try candidate keys and treat '' or a throw as "not this key";
  // a wrong key must land in the same bucket CryptoJS put it in.
  it('answers a wrong passphrase exactly as CryptoJS does', () => {
    const encrypted = CryptoJS.AES.encrypt(SAMPLES[3], PASSPHRASE).toString();

    for (let attempt = 0; attempt < 3000; attempt += 1) {
      const wrong = toHex(Random.getBytes(32));
      expect(outcome(() => legacyAesDecrypt(encrypted, wrong))).toBe(
        outcome(() => cryptoJsDecrypt(encrypted, wrong))
      );
    }
  });
});

import sodium from 'libsodium-wrappers-sumo';

import {
  decryptAES,
  decryptXChacha20,
  encryptAES,
  encryptSha256,
  encryptXChacha20,
  executeKdf,
  generateKdfSalt,
  makeCryptKey,
  makeCryptKeyBytes,
} from './wallet-crypto-util';
import { toHex } from '../encoding';

describe('execute kdf', () => {
  it('success', async () => {
    const salt = 'TESTTESTTESTTEST';
    const password = 'PASSWORD';
    const kdfConfiguration = {
      algorithm: 'argon2id',
      params: {
        outputLength: 32,
        opsLimit: 24,
        memLimitKib: 12 * 1024,
      },
    };
    const result = await executeKdf(salt, password, kdfConfiguration);
    const hexResult = toHex(result);

    expect(hexResult).toBe('71bb8136991859f3f9dc6c4906d75bad4815e73dc5a4db3424e56db7af409889');
  });
});

describe('make cryptkey with kdf', () => {
  it('success', async () => {
    const password = 'PASSWORD';
    const result = await makeCryptKey(password);

    expect(result).toBe('71bb8136991859f3f9dc6c4906d75bad4815e73dc5a4db3424e56db7af409889');
  });
});

describe('encrypt SHA256', () => {
  it('success', async () => {
    const password = 'PASSWORD';
    const result = await encryptSha256(password);

    expect(result).toBe('111f4bbb4167459cd723d3aa07b3f12bf61a60ecf43f981975a6a0de6227fe76');
  });
});

describe('encrypt/decrypt AES', () => {
  it('encrypt success', async () => {
    const value = 'CURRENT_VALUE';
    const password = 'PASSWORD';
    const result = await encryptAES(value, password);

    expect(result).toBeTruthy();
  });

  it('decrypt success', async () => {
    const encryptedValue = 'U2FsdGVkX19RDg/GNciz8vKJlCdfp8oz3k0VJ0ypSgA=';
    const password = 'PASSWORD';
    const result = await decryptAES(encryptedValue, password);

    expect(result).toBe('CURRENT_VALUE');
  });

  it('encrypt with decrypt success', async () => {
    const value = 'CURRENT_VALUE';
    const password = 'PASSWORD';
    const encryptedValue = await encryptAES(value, password);
    const result = await decryptAES(encryptedValue, password);

    expect(result).toBe('CURRENT_VALUE');
  });
});

describe('makeCryptKeyBytes', () => {
  it('returns 32-byte Uint8Array', async () => {
    const salt = await generateKdfSalt();
    const result = await makeCryptKeyBytes('PASSWORD', salt);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(32);
  });
});

describe('encrypt/decrypt XChaCha20-Poly1305', () => {
  const testPassword = 'TEST_PASSWORD';
  let testSalt: Uint8Array;

  beforeAll(async () => {
    testSalt = await generateKdfSalt();
  });

  it('result contains ciphertext and nonce', async () => {
    const result = await encryptXChacha20('hello world', testPassword, testSalt);
    expect(result.ciphertext).toBeTruthy();
    expect(result.nonce).toBeTruthy();
  });

  it('round-trip encrypt then decrypt recovers original', async () => {
    const original = '{"accounts":[],"keyrings":[]}';
    const encrypted = await encryptXChacha20(original, testPassword, testSalt);
    const decrypted = await decryptXChacha20(encrypted, testPassword, testSalt);
    expect(decrypted).toBe(original);
  });

  it('encrypting same plaintext twice produces different ciphertexts', async () => {
    const plain = 'same plaintext';
    const enc1 = await encryptXChacha20(plain, testPassword, testSalt);
    const enc2 = await encryptXChacha20(plain, testPassword, testSalt);
    expect(enc1.ciphertext).not.toBe(enc2.ciphertext);
    expect(enc1.nonce).not.toBe(enc2.nonce);
  });

  it('tampered ciphertext throws on decrypt', async () => {
    await sodium.ready;
    const encrypted = await encryptXChacha20('secret data', testPassword, testSalt);
    const bytes = sodium.from_base64(encrypted.ciphertext);
    bytes[0] ^= 0xff;
    const tampered = { ciphertext: sodium.to_base64(bytes), nonce: encrypted.nonce };

    await expect(decryptXChacha20(tampered, testPassword, testSalt)).rejects.toThrow();
  });

  it('wrong password throws on decrypt', async () => {
    const encrypted = await encryptXChacha20('secret', testPassword, testSalt);
    await expect(decryptXChacha20(encrypted, 'WRONG_PASSWORD', testSalt)).rejects.toThrow();
  });

  it('handles unicode correctly', async () => {
    const original = 'mnemonic seed phrase test \u{1F510}';
    const encrypted = await encryptXChacha20(original, testPassword, testSalt);
    const decrypted = await decryptXChacha20(encrypted, testPassword, testSalt);
    expect(decrypted).toBe(original);
  });

  it('handles large data (64KB)', async () => {
    const largeData = 'x'.repeat(65536);
    const encrypted = await encryptXChacha20(largeData, testPassword, testSalt);
    const decrypted = await decryptXChacha20(encrypted, testPassword, testSalt);
    expect(decrypted).toBe(largeData);
  });
});

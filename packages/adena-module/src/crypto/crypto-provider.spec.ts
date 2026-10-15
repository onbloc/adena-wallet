import {
  CryptoProvider,
  getCryptoProvider,
  libsodiumCryptoProvider,
  setCryptoProvider,
  verifyCryptoProvider,
} from './crypto-provider';
import { Random } from './random';

describe('verifyCryptoProvider', () => {
  afterEach(() => setCryptoProvider(libsodiumCryptoProvider));

  it('accepts the libsodium provider', async () => {
    await expect(verifyCryptoProvider(libsodiumCryptoProvider)).resolves.toBeUndefined();
  });

  it('rejects a random source that repeats itself', async () => {
    const provider: CryptoProvider = {
      ...libsodiumCryptoProvider,
      randomBytes: (length) => new Uint8Array(length).fill(7),
    };
    await expect(verifyCryptoProvider(provider)).rejects.toThrow('random source');
  });

  it('rejects a random source that returns the wrong length', async () => {
    const provider: CryptoProvider = {
      ...libsodiumCryptoProvider,
      randomBytes: (length) => libsodiumCryptoProvider.randomBytes(length - 1),
    };
    await expect(verifyCryptoProvider(provider)).rejects.toThrow('wrong length');
  });

  it('rejects an argon2id that differs from libsodium', async () => {
    const provider: CryptoProvider = {
      ...libsodiumCryptoProvider,
      argon2id: async (password, salt, options) =>
        libsodiumCryptoProvider.argon2id(password, salt, { ...options, opsLimit: 2 }),
    };
    await expect(verifyCryptoProvider(provider)).rejects.toThrow('argon2id');
  });

  it('rejects a cipher that differs from libsodium', async () => {
    const provider: CryptoProvider = {
      ...libsodiumCryptoProvider,
      xchacha20poly1305Encrypt: async (message, key, nonce) => {
        const out = await libsodiumCryptoProvider.xchacha20poly1305Encrypt(message, key, nonce);
        out[0] ^= 1;
        return out;
      },
    };
    await expect(verifyCryptoProvider(provider)).rejects.toThrow('xchacha20poly1305');
  });

  it('rejects a decrypt that does not check the authentication tag', async () => {
    const provider: CryptoProvider = {
      ...libsodiumCryptoProvider,
      xchacha20poly1305Decrypt: async (ciphertext) => ciphertext.slice(0, ciphertext.length - 16),
    };
    await expect(verifyCryptoProvider(provider)).rejects.toThrow('tampered');
  });
});

describe('setCryptoProvider', () => {
  afterEach(() => setCryptoProvider(libsodiumCryptoProvider));

  it('routes Random.getBytes through the registered provider', () => {
    const calls: number[] = [];
    setCryptoProvider({
      ...libsodiumCryptoProvider,
      randomBytes: (length) => {
        calls.push(length);
        return libsodiumCryptoProvider.randomBytes(length);
      },
    });

    expect(Random.getBytes(16)).toHaveLength(16);
    expect(calls).toEqual([16]);
    expect(getCryptoProvider()).not.toBe(libsodiumCryptoProvider);
  });
});

import sodium from 'libsodium-wrappers-sumo';
import {verifyCryptoProvider} from 'adena-module';

import {
  exactBytes,
  nativeCryptoProvider,
} from '../../src/platform/native-crypto-provider';

beforeAll(async () => {
  await sodium.ready;
});

describe('nativeCryptoProvider', () => {
  it('passes the libsodium known-answer self-test', async () => {
    await expect(
      verifyCryptoProvider(nativeCryptoProvider),
    ).resolves.toBeUndefined();
  });

  it('encrypts with the exact key when the key is a view into a larger buffer', async () => {
    const backing = sodium.randombytes_buf(96);
    const keyView = backing.subarray(32, 64);
    const nonce = sodium.randombytes_buf(24);
    const message = new TextEncoder().encode('vault');

    const sealed = await nativeCryptoProvider.xchacha20poly1305Encrypt(
      message,
      keyView,
      nonce,
    );
    const expected = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
      message,
      null,
      null,
      nonce,
      keyView.slice(),
    );

    expect(Buffer.from(sealed).toString('hex')).toBe(
      Buffer.from(expected).toString('hex'),
    );
  });

  it('derives the same Argon2id key from a salt view as from a plain salt', async () => {
    const backing = sodium.randombytes_buf(48);
    const saltView = backing.subarray(16, 32);
    const options = {outputLength: 32, opsLimit: 1, memLimitKib: 8};

    const fromView = await nativeCryptoProvider.argon2id(
      'pw',
      saltView,
      options,
    );
    const fromCopy = await nativeCryptoProvider.argon2id(
      'pw',
      saltView.slice(),
      options,
    );

    expect(fromView).toEqual(fromCopy);
  });

  it('refuses a tampered ciphertext', async () => {
    const key = sodium.randombytes_buf(32);
    const nonce = sodium.randombytes_buf(24);
    const sealed = await nativeCryptoProvider.xchacha20poly1305Encrypt(
      new TextEncoder().encode('vault'),
      key,
      nonce,
    );
    sealed[sealed.length - 1] = (sealed[sealed.length - 1] + 1) % 256;

    await expect(
      nativeCryptoProvider.xchacha20poly1305Decrypt(sealed, key, nonce),
    ).rejects.toThrow();
  });

  it('zeroes buffers in memzero', () => {
    const buffer = Uint8Array.from([1, 2, 3]);
    nativeCryptoProvider.memzero(buffer);
    expect(Array.from(buffer)).toEqual([0, 0, 0]);
  });
});

describe('exactBytes', () => {
  it('returns the same array when it already spans its whole buffer', () => {
    const bytes = new Uint8Array(8);
    expect(exactBytes(bytes)).toBe(bytes);
  });

  it('copies a view so the copy owns an exact-length buffer', () => {
    const view = new Uint8Array(16).subarray(4, 8);
    const copy = exactBytes(view);
    expect(copy).not.toBe(view);
    expect(copy.buffer.byteLength).toBe(4);
  });
});

import { scryptAsync } from '@noble/hashes/scrypt.js';
import { NitroModules } from 'react-native-nitro-modules';

import { AppError, isAppError } from '../../../src/core/errors';
import { createNativeScryptKdf } from '../../../src/security/native-scrypt-kdf';

jest.mock('react-native-nitro-modules', () => ({ NitroModules: { createHybridObject: jest.fn() } }));

const createHybridObject = NitroModules.createHybridObject as jest.Mock;
const params = { N: 1024, r: 8, p: 1, dkLen: 4 };

const toBuffer = (bytes: number[]): ArrayBuffer => new Uint8Array(bytes).buffer;

// Stands in for OpenSSL with the reference implementation, in the native argument order.
const nobleNative = {
  deriveKey: async (password: ArrayBuffer, salt: ArrayBuffer, N: number, r: number, p: number, _maxmem: number, dkLen: number) =>
    (await scryptAsync(new Uint8Array(password), new Uint8Array(salt), { N, r, p, dkLen })).buffer as ArrayBuffer,
};

describe('createNativeScryptKdf', () => {
  const originalDev = (globalThis as { __DEV__?: boolean }).__DEV__;

  afterEach(() => {
    createHybridObject.mockReset();
    (globalThis as { __DEV__?: boolean }).__DEV__ = originalDev;
  });

  it('loads the native module once and reuses it', async () => {
    const deriveKey = jest.fn(async () => toBuffer([1, 2, 3, 4]));

    createHybridObject.mockReturnValue({ deriveKey });
    const kdf = createNativeScryptKdf();

    await kdf.derive(new Uint8Array([1]), new Uint8Array([2]), params);
    await kdf.derive(new Uint8Array([1]), new Uint8Array([2]), params);
    expect(createHybridObject).toHaveBeenCalledTimes(1);
  });

  it('passes the startup check when the native output matches RFC 7914', async () => {
    createHybridObject.mockReturnValue(nobleNative);
    await expect(createNativeScryptKdf().assertWorking()).resolves.toBeUndefined();
  });

  it('fails the startup check when the native output differs', async () => {
    createHybridObject.mockReturnValue({ deriveKey: async () => new Uint8Array(64).buffer });
    await expect(createNativeScryptKdf().assertWorking()).rejects.toMatchObject({ code: 'CRYPTO_UNAVAILABLE' });
  });

  it('fails the startup check when arguments reach the native module in the wrong order', async () => {
    createHybridObject.mockReturnValue({
      deriveKey: (password: ArrayBuffer, salt: ArrayBuffer, N: number, r: number, p: number, maxmem: number, dkLen: number) =>
        nobleNative.deriveKey(password, salt, N, p + 1, r, maxmem, dkLen),
    });
    await expect(createNativeScryptKdf().assertWorking()).rejects.toMatchObject({ code: 'CRYPTO_UNAVAILABLE' });
  });

  it('lazily loads on derive and passes maxmem with slack', async () => {
    const deriveKey = jest.fn(async (..._args: unknown[]) => toBuffer([9, 8, 7, 6]));

    createHybridObject.mockReturnValue({ deriveKey });
    const key = await createNativeScryptKdf().derive(new Uint8Array([1, 2]), new Uint8Array([3]), params);

    expect(Array.from(key)).toEqual([9, 8, 7, 6]);
    const [password, salt, N, r, p, maxmem, keylen] = deriveKey.mock.calls[0];

    expect(new Uint8Array(salt as ArrayBuffer)).toEqual(new Uint8Array([3]));
    expect(new Uint8Array(password as ArrayBuffer)).toEqual(new Uint8Array([0, 0]));
    expect([N, r, p, keylen]).toEqual([1024, 8, 1, 4]);
    expect(maxmem).toBe(128 * 8 * (1024 + 1 + 2) + 1024 * 1024);
  });

  it('wipes the native output buffer and returns an independent copy', async () => {
    const native = toBuffer([5, 5, 5, 5]);

    createHybridObject.mockReturnValue({ deriveKey: async () => native });
    const key = await createNativeScryptKdf().derive(new Uint8Array([1]), new Uint8Array([1]), params);

    expect(Array.from(new Uint8Array(native))).toEqual([0, 0, 0, 0]);
    expect(Array.from(key)).toEqual([5, 5, 5, 5]);
  });

  it('does not mutate the caller password', async () => {
    createHybridObject.mockReturnValue({ deriveKey: async () => toBuffer([1]) });
    const password = new Uint8Array([7, 7]);

    await createNativeScryptKdf().derive(password, new Uint8Array(), params);
    expect(Array.from(password)).toEqual([7, 7]);
  });

  it('wipes the password copy even when native derivation fails', async () => {
    let seen: ArrayBuffer | undefined;

    createHybridObject.mockReturnValue({
      deriveKey: async (password: ArrayBuffer) => {
        seen = password;
        throw new Error('openssl failure');
      },
    });

    await expect(createNativeScryptKdf().derive(new Uint8Array([1, 2]), new Uint8Array(), params)).rejects.toThrow('openssl failure');
    expect(Array.from(new Uint8Array(seen!))).toEqual([0, 0]);
  });

  it('includes the cause message in dev builds', async () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    const cause = new Error('missing pod');

    createHybridObject.mockImplementation(() => {
      throw cause;
    });
    const error = await createNativeScryptKdf().assertWorking().catch((caught: unknown) => caught) as AppError;

    expect(isAppError(error, 'CRYPTO_UNAVAILABLE')).toBe(true);
    expect(error.message).toContain('(missing pod)');
    expect((error as { cause?: unknown }).cause).toBe(cause);
  });

  it('omits the detail in release builds and for non-Error causes', async () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    createHybridObject.mockImplementation(() => {
      throw new Error('missing pod');
    });
    const release = await createNativeScryptKdf().assertWorking().catch((caught: unknown) => caught) as AppError;

    expect(release.message).toBe('Native cryptography is not available on this build.');

    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    createHybridObject.mockImplementation(() => {
      throw 'string failure';
    });
    await expect(createNativeScryptKdf().derive(new Uint8Array(), new Uint8Array(), params))
      .rejects.toMatchObject({ code: 'CRYPTO_UNAVAILABLE', message: 'Native cryptography is not available on this build.' });
  });
});

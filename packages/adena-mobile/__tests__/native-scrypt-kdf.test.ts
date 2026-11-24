import { toHex } from '@cosmjs/encoding';
import { NitroModules } from 'react-native-nitro-modules';

import { isAppError } from '../src/core/errors';
import { createNativeScryptKdf } from '../src/security/native-scrypt-kdf';
import { nobleScryptKdf } from '../src/security/scrypt-kdf';
import { RFC7914_VECTORS } from './scrypt-kdf.test';

jest.mock('react-native-nitro-modules', () => ({ NitroModules: { createHybridObject: jest.fn() } }));

const createHybridObject = NitroModules.createHybridObject as jest.Mock;
const encode = (text: string): Uint8Array => new TextEncoder().encode(text);

// Stand-in for quick-crypto's OpenSSL `Scrypt.deriveKey(password, salt, N, r, p, maxmem, keylen)`.
interface DeriveCall {
  password: ArrayBuffer;
  args: number[];
}

const fakeOpenSsl = (): DeriveCall[] => {
  const calls: DeriveCall[] = [];
  const deriveKey = jest.fn(async (password: ArrayBuffer, salt: ArrayBuffer, N: number, r: number, p: number, maxmem: number, keylen: number): Promise<ArrayBuffer> => {
    calls.push({ password, args: [N, r, p, maxmem, keylen] });
    expect(maxmem).toBeGreaterThanOrEqual(128 * r * (N + p + 2));
    const key = await nobleScryptKdf.derive(new Uint8Array(password), new Uint8Array(salt), { N, r, p, dkLen: keylen });

    const out = new ArrayBuffer(key.byteLength);

    new Uint8Array(out).set(key);
    return out;
  });

  createHybridObject.mockReturnValue({ deriveKey });
  return calls;
};

describe('native scrypt adapter', () => {
  beforeEach(() => createHybridObject.mockReset());

  it('maps parameters in OpenSSL order and returns the RFC 7914 output', async () => {
    const calls = fakeOpenSsl();
    const [vector] = RFC7914_VECTORS;
    const key = await createNativeScryptKdf().derive(encode(vector.password), encode(vector.salt), vector.params);

    expect(toHex(key)).toBe(vector.expected);
    expect(calls[0].args.slice(0, 3)).toEqual([1024, 8, 16]);
    expect(calls[0].args[4]).toBe(64);
    expect(createHybridObject).toHaveBeenCalledWith('Scrypt');
  });

  it('wipes the password copy handed to native code', async () => {
    const calls = fakeOpenSsl();

    await createNativeScryptKdf().derive(encode('password'), encode('salt'), { N: 16, r: 1, p: 1, dkLen: 32 });
    expect(new Uint8Array(calls[0].password).every(byte => byte === 0)).toBe(true);
  });

  it('fails closed with CRYPTO_UNAVAILABLE when the native module is missing', async () => {
    createHybridObject.mockImplementation(() => {
      throw new Error('HybridObject "Scrypt" not found');
    });
    const error = await createNativeScryptKdf().assertWorking().catch((caught: unknown) => caught);

    expect(isAppError(error, 'CRYPTO_UNAVAILABLE')).toBe(true);
  });

  it('passes the startup known-answer check through the OpenSSL argument mapping', async () => {
    fakeOpenSsl();
    await expect(createNativeScryptKdf().assertWorking()).resolves.toBeUndefined();
  });
});

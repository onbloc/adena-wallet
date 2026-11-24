import { fromBase64, toBase64 } from '@cosmjs/encoding';

import { isAppError } from '../../../src/core/errors';
import { ScryptKdf } from '../../../src/security/scrypt-kdf';
import { DEFAULT_KDF_SETTINGS, EncryptedPayload, ScryptXChaChaVaultCipher } from '../../../src/security/vault-cipher';

const SETTINGS = { N: 2 ** 10, r: 8, p: 1 };
const cipher = new ScryptXChaChaVaultCipher(SETTINGS);

const capture = async (promise: Promise<unknown>): Promise<unknown> => promise.then(() => undefined, error => error);

describe('ScryptXChaChaVaultCipher', () => {
  it('uses strong defaults', () => {
    expect(DEFAULT_KDF_SETTINGS).toEqual({ N: 2 ** 15, r: 8, p: 1 });
    expect(new ScryptXChaChaVaultCipher().needsRehash({ kdf: { name: 'scrypt', ...DEFAULT_KDF_SETTINGS, dkLen: 32, salt: '' } } as EncryptedPayload)).toBe(false);
  });

  it('persists every parameter in the payload', async () => {
    const payload = await cipher.encrypt('hello', 'pw');

    expect(payload.kdf).toMatchObject({ name: 'scrypt', ...SETTINGS, dkLen: 32 });
    expect(fromBase64(payload.kdf.salt)).toHaveLength(16);
    expect(payload.cipher.name).toBe('xchacha20poly1305');
    expect(fromBase64(payload.cipher.nonce)).toHaveLength(24);
    expect(fromBase64(payload.ciphertext)).toHaveLength(5 + 16);
  });

  it.each(['', 'unicode 🔐 한글 ✓', 'x'.repeat(10_000)])('round-trips %#', async (plaintext) => {
    await expect(cipher.decrypt(await cipher.encrypt(plaintext, 'pw'), 'pw')).resolves.toBe(plaintext);
  });

  it('round-trips an empty password', async () => {
    await expect(cipher.decrypt(await cipher.encrypt('s', ''), '')).resolves.toBe('s');
  });

  it('decrypts with the payload parameters, not the instance settings', async () => {
    const payload = await new ScryptXChaChaVaultCipher({ N: 2 ** 8, r: 4, p: 2 }).encrypt('legacy', 'pw');

    await expect(cipher.decrypt(payload, 'pw')).resolves.toBe('legacy');
  });

  it('rejects unsupported kdf or cipher names', async () => {
    const payload = await cipher.encrypt('s', 'pw');
    const badKdf = { ...payload, kdf: { ...payload.kdf, name: 'pbkdf2' } } as unknown as EncryptedPayload;
    const badCipher = { ...payload, cipher: { ...payload.cipher, name: 'aes' } } as unknown as EncryptedPayload;

    expect(isAppError(await capture(cipher.decrypt(badKdf, 'pw')), 'STORAGE_ERROR')).toBe(true);
    expect(isAppError(await capture(cipher.decrypt(badCipher, 'pw')), 'STORAGE_ERROR')).toBe(true);
  });

  it('rejects wrong passwords and tampered ciphertext with INVALID_PASSWORD', async () => {
    const payload = await cipher.encrypt('secret', 'pw');
    const bytes = fromBase64(payload.ciphertext);

    bytes[0] ^= 0xff;
    expect(isAppError(await capture(cipher.decrypt(payload, 'wrong')), 'INVALID_PASSWORD')).toBe(true);
    expect(isAppError(await capture(cipher.decrypt({ ...payload, ciphertext: toBase64(bytes) }, 'pw')), 'INVALID_PASSWORD')).toBe(true);
    expect(isAppError(await capture(cipher.decrypt({ ...payload, cipher: { ...payload.cipher, nonce: toBase64(new Uint8Array(3)) } }, 'pw')), 'INVALID_PASSWORD')).toBe(true);
  });

  it('wipes password bytes and derived keys', async () => {
    const seen: Uint8Array[] = [];
    const keys: Uint8Array[] = [];
    const kdf: ScryptKdf = {
      derive: async (password) => {
        seen.push(password);
        const key = new Uint8Array(32).fill(1);

        keys.push(key);
        return key;
      },
    };
    const wiping = new ScryptXChaChaVaultCipher(SETTINGS, kdf);
    const payload = await wiping.encrypt('s', 'pw');

    await wiping.decrypt(payload, 'pw');
    await capture(wiping.decrypt({ ...payload, ciphertext: toBase64(new Uint8Array(17)) }, 'pw'));
    expect(seen.every(bytes => bytes.every(byte => byte === 0))).toBe(true);
    expect(keys.every(bytes => bytes.every(byte => byte === 0))).toBe(true);
    expect(keys).toHaveLength(3);
  });

  it('wipes the password even when the kdf throws', async () => {
    let seen: Uint8Array | undefined;
    const failing = new ScryptXChaChaVaultCipher(SETTINGS, {
      derive: async (password) => {
        seen = password;
        throw new Error('kdf down');
      },
    });

    await expect(failing.encrypt('s', 'pw')).rejects.toThrow('kdf down');
    expect(seen!.every(byte => byte === 0)).toBe(true);
  });

  it.each([
    [{ N: 2 ** 9, r: 8, p: 1 }, true],
    [{ N: 2 ** 11, r: 8, p: 1 }, false],
    [{ N: 2 ** 10, r: 4, p: 1 }, true],
    [{ N: 2 ** 10, r: 8, p: 2 }, true],
    [SETTINGS, false],
  ])('needsRehash(%o) is %s', (kdf, expected) => {
    expect(cipher.needsRehash({ kdf: { name: 'scrypt', ...kdf, dkLen: 32, salt: '' } } as EncryptedPayload)).toBe(expected);
  });
});

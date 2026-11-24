import { isAppError } from '../src/core/errors';
import { ScryptXChaChaVaultCipher } from '../src/security/vault-cipher';

const cipher = new ScryptXChaChaVaultCipher({ N: 2 ** 10, r: 8, p: 1 });

describe('ScryptXChaChaVaultCipher', () => {
  it('round-trips plaintext with the right password', async () => {
    const payload = await cipher.encrypt('secret words', 'password-1');

    expect(payload.ciphertext).not.toContain('secret');
    await expect(cipher.decrypt(payload, 'password-1')).resolves.toBe('secret words');
  });

  it('uses a fresh salt and nonce for every encryption', async () => {
    const [a, b] = await Promise.all([cipher.encrypt('same', 'pw-123456'), cipher.encrypt('same', 'pw-123456')]);

    expect(a.kdf.salt).not.toBe(b.kdf.salt);
    expect(a.cipher.nonce).not.toBe(b.cipher.nonce);
  });

  it('rejects a wrong password with INVALID_PASSWORD', async () => {
    const payload = await cipher.encrypt('secret', 'password-1');

    await cipher.decrypt(payload, 'password-2').catch(error => expect(isAppError(error, 'INVALID_PASSWORD')).toBe(true));
  });

  it('flags payloads encrypted with weaker KDF settings', async () => {
    const weak = await new ScryptXChaChaVaultCipher({ N: 2 ** 8, r: 8, p: 1 }).encrypt('x', 'password-1');

    expect(cipher.needsRehash(weak)).toBe(true);
    expect(cipher.needsRehash(await cipher.encrypt('x', 'password-1'))).toBe(false);
  });
});

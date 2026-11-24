import { AppError, isAppError } from '../../../src/core/errors';
import { KeyringRecord, KeyringType } from '../../../src/crypto/keyring';
import { SecurePasswordAttemptRepository } from '../../../src/repositories/password-attempt.repository';
import { SecureVaultRepository } from '../../../src/repositories/vault.repository';
import { MemorySecureStore } from '../../../src/security/memory-secure-store';
import { SecureKey } from '../../../src/security/secure-keys';
import { ScryptXChaChaVaultCipher } from '../../../src/security/vault-cipher';
import { KeyringSession } from '../../../src/services/keyring-session';
import { FREE_PASSWORD_ATTEMPTS, PasswordAttemptLimiter } from '../../../src/services/password-attempt-limiter';
import { VaultService } from '../../../src/services/vault.service';

const PASSWORD = 'correct horse battery';
const LOW_COST = { N: 2 ** 10, r: 8, p: 1 };
const pk = (id: string, fill: string): KeyringRecord => ({ id, type: KeyringType.PRIVATE_KEY, privateKey: fill.repeat(64), createdAt: 1 });

const setup = (settings = LOW_COST) => {
  const secureStore = new MemorySecureStore();
  const repository = new SecureVaultRepository(secureStore);
  const attempts = new SecurePasswordAttemptRepository(secureStore);
  const limiter = new PasswordAttemptLimiter(attempts, () => 1_000_000);

  return { secureStore, repository, attempts, limiter, service: new VaultService(repository, new ScryptXChaChaVaultCipher(settings), limiter) };
};

describe('PasswordAttemptLimiter under overlapping checks', () => {
  it('records every failure of a concurrent batch and locks the attempt after the free ones', async () => {
    const { limiter, attempts } = setup();
    const wrong = async (): Promise<never> => {
      await new Promise(resolve => setTimeout(resolve, 1));
      throw new AppError('INVALID_PASSWORD');
    };
    const results = await Promise.allSettled(Array.from({ length: FREE_PASSWORD_ATTEMPTS + 2 }, () => limiter.run(wrong)));
    const codes = results.map(result => (result.status === 'rejected' && isAppError(result.reason) ? result.reason.code : 'ok'));

    expect(codes.slice(0, FREE_PASSWORD_ATTEMPTS + 1)).toEqual(Array(FREE_PASSWORD_ATTEMPTS + 1).fill('INVALID_PASSWORD'));
    expect(codes[FREE_PASSWORD_ATTEMPTS + 1]).toBe('PASSWORD_ATTEMPTS_EXCEEDED');
    expect((await attempts.get()).failures).toBe(FREE_PASSWORD_ATTEMPTS + 1);
  });
});

describe('VaultService consistency', () => {
  it('keeps every keyring when additions overlap', async () => {
    const { service } = setup();

    await service.create([pk('a', '1')], PASSWORD);
    await Promise.all([service.addKeyring(pk('b', '2'), PASSWORD), service.addKeyring(pk('c', '3'), PASSWORD)]);

    expect((await service.open(PASSWORD)).keyrings.map(keyring => keyring.id)).toEqual(['a', 'b', 'c']);
  });

  it('rejects a keyring whose secret is already in the vault', async () => {
    const { service } = setup();
    const phrase = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

    await service.create([{ id: 'hd', type: KeyringType.HD_WALLET, mnemonic: phrase, createdAt: 1 }, pk('a', 'a')], PASSWORD);

    await expect(service.addKeyring({ id: 'hd2', type: KeyringType.HD_WALLET, mnemonic: `  ${phrase.toUpperCase()} `, createdAt: 2 }, PASSWORD))
      .rejects.toMatchObject({ code: 'WALLET_ALREADY_EXISTS' });
    await expect(service.addKeyring(pk('b', 'A'), PASSWORD)).rejects.toMatchObject({ code: 'WALLET_ALREADY_EXISTS' });
    expect((await service.open(PASSWORD)).keyrings.map(keyring => keyring.id)).toEqual(['hd', 'a']);
  });

  it('still unlocks when re-encrypting with newer settings fails', async () => {
    const weak = setup({ N: 2 ** 9, r: 8, p: 1 });

    await weak.service.create([pk('a', '1')], PASSWORD);
    const service = new VaultService(weak.repository, new ScryptXChaChaVaultCipher(LOW_COST), weak.limiter);
    const before = await weak.secureStore.getItem(SecureKey.VAULT);

    jest.spyOn(weak.repository, 'write').mockRejectedValueOnce(new Error('keychain write failed'));
    await expect(service.open(PASSWORD)).resolves.toMatchObject({ keyrings: [expect.objectContaining({ id: 'a' })] });
    expect(await weak.secureStore.getItem(SecureKey.VAULT)).toBe(before);

    await service.open(PASSWORD);
    expect(await weak.secureStore.getItem(SecureKey.VAULT)).not.toBe(before);
  });
});

describe('KeyringSession.remove', () => {
  it('wipes the keyring so it can no longer sign', async () => {
    const session = new KeyringSession();

    session.open([pk('a', '1'), pk('b', '2')]);
    session.remove('a');

    await expect(session.withKeyPair('a', 0, async () => 'signed')).rejects.toMatchObject({ code: 'WALLET_NOT_FOUND' });
    await expect(session.withKeyPair('b', 0, async () => 'signed')).resolves.toBe('signed');
    expect(() => session.remove('missing')).not.toThrow();
  });

  it('advances the epoch on every close', () => {
    const session = new KeyringSession();
    const before = session.epoch;

    session.open([]);
    session.close();
    expect(session.epoch).toBeGreaterThan(before);
  });
});

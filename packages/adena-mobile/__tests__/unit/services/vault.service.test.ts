import { isAppError } from '../../../src/core/errors';
import { KeyringRecord, KeyringType } from '../../../src/crypto/keyring';
import { SecurePasswordAttemptRepository } from '../../../src/repositories/password-attempt.repository';
import { SecureVaultRepository } from '../../../src/repositories/vault.repository';
import { MemorySecureStore } from '../../../src/security/memory-secure-store';
import { SecureKey } from '../../../src/security/secure-keys';
import { ScryptXChaChaVaultCipher } from '../../../src/security/vault-cipher';
import { FREE_PASSWORD_ATTEMPTS, PasswordAttemptLimiter } from '../../../src/services/password-attempt-limiter';
import { VaultService } from '../../../src/services/vault.service';
import { catchError } from '../../helpers/service-fakes';
import { TEST_MNEMONIC, TEST_PASSWORD } from '../../helpers/test-container';

const LOW_COST = { N: 2 ** 10, r: 8, p: 1 };
const HD: KeyringRecord = { id: 'hd', type: KeyringType.HD_WALLET, mnemonic: TEST_MNEMONIC, createdAt: 1 };
const PK: KeyringRecord = { id: 'pk', type: KeyringType.PRIVATE_KEY, privateKey: '1'.repeat(64), createdAt: 2 };

const setup = (settings = LOW_COST, secureStore = new MemorySecureStore(), clock = { now: 1_000_000 }) => {
  const cipher = new ScryptXChaChaVaultCipher(settings);
  const repository = new SecureVaultRepository(secureStore);
  const limiter = new PasswordAttemptLimiter(new SecurePasswordAttemptRepository(secureStore), () => clock.now);

  return { service: new VaultService(repository, cipher, limiter), repository, cipher, secureStore, clock };
};

const codeOf = async (run: () => unknown) => {
  const error = await catchError(run);

  return isAppError(error) ? error.code : error;
};

const attempts = async (secureStore: MemorySecureStore) => JSON.parse((await secureStore.getItem(SecureKey.PASSWORD_ATTEMPTS)) ?? '{"failures":0}').failures;

describe('VaultService', () => {
  it('creates an encrypted vault with cached seeds', async () => {
    const { service, secureStore } = setup();

    expect(await service.exists()).toBe(false);
    const content = await service.create([HD, PK], TEST_PASSWORD);

    expect(await service.exists()).toBe(true);
    expect(content.keyrings[0]).toMatchObject({ id: 'hd', seed: expect.stringMatching(/^[0-9a-f]{128}$/) });
    expect(content.keyrings[1]).toEqual(PK);
    const raw = (await secureStore.getItem(SecureKey.VAULT)) ?? '';

    expect(raw).not.toContain('abandon');
    expect(raw).not.toContain('1111111111');
    expect(JSON.parse(raw).record.contentVersion).toBe(1);
  });

  it('refuses to overwrite an existing vault', async () => {
    const { service } = setup();

    await service.create([HD], TEST_PASSWORD);
    expect(await codeOf(() => service.create([PK], 'another password'))).toBe('WALLET_ALREADY_EXISTS');
    await expect(service.open(TEST_PASSWORD)).resolves.toMatchObject({ keyrings: [expect.objectContaining({ id: 'hd' })] });
  });

  it('opens with the right password and rejects a wrong one', async () => {
    const { service, secureStore } = setup();

    await service.create([HD], TEST_PASSWORD);
    expect(await codeOf(() => service.open('wrong password'))).toBe('INVALID_PASSWORD');
    expect(await attempts(secureStore)).toBe(1);
    await expect(service.open(TEST_PASSWORD)).resolves.toMatchObject({ keyrings: [expect.objectContaining({ mnemonic: TEST_MNEMONIC })] });
    expect(await attempts(secureStore)).toBe(0);
  });

  it('reports a missing vault without counting it as a failed attempt', async () => {
    const { service, secureStore } = setup();

    expect(await codeOf(() => service.open(TEST_PASSWORD))).toBe('WALLET_NOT_FOUND');
    expect(await attempts(secureStore)).toBe(0);
  });

  it('locks out every password check after repeated failures', async () => {
    const { service, clock } = setup();

    await service.create([HD], TEST_PASSWORD);

    for (let i = 0; i <= FREE_PASSWORD_ATTEMPTS; i++) {
      expect(await codeOf(() => service.open('wrong password'))).toBe('INVALID_PASSWORD');
    }

    expect(await codeOf(() => service.verifyPassword(TEST_PASSWORD))).toBe('PASSWORD_ATTEMPTS_EXCEEDED');
    expect(await codeOf(() => service.changePassword(TEST_PASSWORD, 'next password'))).toBe('PASSWORD_ATTEMPTS_EXCEEDED');
    clock.now += 30_000;
    await expect(service.verifyPassword(TEST_PASSWORD)).resolves.toBeUndefined();
  });

  describe('openWithEscrowedPassword', () => {
    it('bypasses the lockout and clears failures on success', async () => {
      const { service, secureStore } = setup();

      await service.create([HD], TEST_PASSWORD);

      for (let i = 0; i <= FREE_PASSWORD_ATTEMPTS; i++) {
        await catchError(() => service.open('wrong password'));
      }

      await expect(service.openWithEscrowedPassword(TEST_PASSWORD)).resolves.toMatchObject({ keyrings: [expect.objectContaining({ id: 'hd' })] });
      expect(await attempts(secureStore)).toBe(0);
    });

    it('does not count a stale escrowed password as an attempt', async () => {
      const { service, secureStore } = setup();

      await service.create([HD], TEST_PASSWORD);
      expect(await codeOf(() => service.openWithEscrowedPassword('stale password'))).toBe('INVALID_PASSWORD');
      expect(await attempts(secureStore)).toBe(0);
    });
  });

  describe('re-encryption on open', () => {
    it('caches a missing seed of an older vault', async () => {
      const { service, repository, cipher } = setup();

      await repository.write({ contentVersion: 1, payload: await cipher.encrypt(JSON.stringify({ keyrings: [HD] }), TEST_PASSWORD) });
      const before = (await repository.read())?.payload.ciphertext;
      const content = await service.open(TEST_PASSWORD);

      expect(content.keyrings[0]).toHaveProperty('seed');
      expect((await repository.read())?.payload.ciphertext).not.toBe(before);
    });

    it('migrates content written by an older app version', async () => {
      const { service, repository, cipher } = setup();
      const seeded = (await service.create([HD], TEST_PASSWORD)).keyrings;

      await repository.write({ contentVersion: 0, payload: await cipher.encrypt(JSON.stringify({ keyrings: seeded }), TEST_PASSWORD) });
      await service.open(TEST_PASSWORD);
      expect((await repository.read())?.contentVersion).toBe(1);
    });

    it('leaves an up-to-date vault untouched', async () => {
      const { service, repository } = setup();

      await service.create([HD], TEST_PASSWORD);
      const before = await repository.read();

      await service.open(TEST_PASSWORD);
      expect(await repository.read()).toEqual(before);
    });

    it('re-hashes with stronger KDF settings', async () => {
      const secureStore = new MemorySecureStore();

      await setup(LOW_COST, secureStore).service.create([HD], TEST_PASSWORD);
      const stronger = setup({ ...LOW_COST, N: 2 ** 11 }, secureStore);

      await stronger.service.open(TEST_PASSWORD);
      expect((await stronger.repository.read())?.payload.kdf.N).toBe(2 ** 11);
    });

    it('refuses content from a newer app version', async () => {
      const { service, repository, cipher } = setup();

      await repository.write({ contentVersion: 2, payload: await cipher.encrypt(JSON.stringify({ keyrings: [] }), TEST_PASSWORD) });
      expect(await codeOf(() => service.open(TEST_PASSWORD))).toBe('MIGRATION_FAILED');
    });
  });

  it('adds and removes keyrings behind the password', async () => {
    const { service } = setup();

    await service.create([HD], TEST_PASSWORD);
    expect(await codeOf(() => service.addKeyring(PK, 'wrong password'))).toBe('INVALID_PASSWORD');
    expect((await service.addKeyring(PK, TEST_PASSWORD)).keyrings.map(keyring => keyring.id)).toEqual(['hd', 'pk']);
    expect(await codeOf(() => service.removeKeyring('pk', 'wrong password'))).toBe('INVALID_PASSWORD');
    expect((await service.removeKeyring('pk', TEST_PASSWORD)).keyrings.map(keyring => keyring.id)).toEqual(['hd']);
    expect((await service.removeKeyring('missing', TEST_PASSWORD)).keyrings.map(keyring => keyring.id)).toEqual(['hd']);
    expect((await service.open(TEST_PASSWORD)).keyrings).toHaveLength(1);
  });

  it('changes the password', async () => {
    const { service } = setup();

    await service.create([HD], TEST_PASSWORD);
    expect(await codeOf(() => service.changePassword('wrong password', 'next password'))).toBe('INVALID_PASSWORD');
    await service.changePassword(TEST_PASSWORD, 'next password');
    expect(await codeOf(() => service.open(TEST_PASSWORD))).toBe('INVALID_PASSWORD');
    await expect(service.open('next password')).resolves.toBeDefined();
  });

  it('destroys the vault', async () => {
    const { service } = setup();

    await service.create([HD], TEST_PASSWORD);
    await service.destroy();
    expect(await service.exists()).toBe(false);
    expect(await codeOf(() => service.open(TEST_PASSWORD))).toBe('WALLET_NOT_FOUND');
  });
});

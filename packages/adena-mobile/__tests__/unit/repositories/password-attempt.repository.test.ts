import { SecurePasswordAttemptRepository } from '../../../src/repositories/password-attempt.repository';
import { MemorySecureStore } from '../../../src/security/memory-secure-store';
import { SecureKey } from '../../../src/security/secure-keys';

const EMPTY = { failures: 0, lockedUntil: 0 };

describe('SecurePasswordAttemptRepository', () => {
  let secureStore: MemorySecureStore;
  let repository: SecurePasswordAttemptRepository;

  beforeEach(() => {
    secureStore = new MemorySecureStore();
    repository = new SecurePasswordAttemptRepository(secureStore);
  });

  it('returns an empty state when nothing is stored', async () => {
    await expect(repository.get()).resolves.toEqual(EMPTY);
  });

  it('round-trips a saved state and clears it', async () => {
    await repository.save({ failures: 3, lockedUntil: 1234 });
    await expect(repository.get()).resolves.toEqual({ failures: 3, lockedUntil: 1234 });
    await repository.clear();
    await expect(secureStore.hasItem(SecureKey.PASSWORD_ATTEMPTS)).resolves.toBe(false);
    await expect(repository.get()).resolves.toEqual(EMPTY);
  });

  it.each([
    ['empty string', ''],
    ['invalid JSON', '{nope'],
    ['JSON null', 'null'],
    ['empty object', '{}'],
  ])('falls back to empty for %s', async (_label, raw) => {
    await secureStore.setItem(SecureKey.PASSWORD_ATTEMPTS, raw);
    await expect(repository.get()).resolves.toEqual(EMPTY);
  });

  it.each([
    [{ failures: -2, lockedUntil: 5 }, { failures: 0, lockedUntil: 5 }],
    [{ failures: 1.5, lockedUntil: 5 }, { failures: 0, lockedUntil: 5 }],
    [{ failures: '4', lockedUntil: '5' }, { failures: 0, lockedUntil: 0 }],
    [{ failures: 0, lockedUntil: null }, { failures: 0, lockedUntil: 0 }],
    [{ failures: 7 }, { failures: 7, lockedUntil: 0 }],
  ])('sanitizes %o', async (stored, expected) => {
    await secureStore.setItem(SecureKey.PASSWORD_ATTEMPTS, JSON.stringify(stored));
    await expect(repository.get()).resolves.toEqual(expected);
  });
});

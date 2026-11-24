import { isAppError } from '../../../src/core/errors';
import { SecureBiometricCredentialRepository } from '../../../src/repositories/biometric-credential.repository';
import { BiometricOutcome, MemorySecureStore } from '../../../src/security/memory-secure-store';
import { SecureKey } from '../../../src/security/secure-keys';
import { BiometryKind, SecureAccessPolicy } from '../../../src/security/secure-store';

describe('SecureBiometricCredentialRepository', () => {
  let secureStore: MemorySecureStore;
  let repository: SecureBiometricCredentialRepository;

  beforeEach(() => {
    secureStore = new MemorySecureStore();
    repository = new SecureBiometricCredentialRepository(secureStore);
  });

  it('delegates biometry kind', async () => {
    await expect(repository.getBiometryKind()).resolves.toBe(BiometryKind.FACE);
    secureStore.biometryKind = null;
    await expect(repository.getBiometryKind()).resolves.toBeNull();
  });

  it('saves with the biometric policy and reads with the prompt', async () => {
    const setSpy = jest.spyOn(secureStore, 'setItem');
    const getSpy = jest.spyOn(secureStore, 'getItem');

    await expect(repository.hasCredential()).resolves.toBe(false);
    await expect(repository.readCredential({ title: 'Unlock' })).resolves.toBeNull();
    await repository.saveCredential('pw');
    await expect(repository.hasCredential()).resolves.toBe(true);
    await expect(repository.readCredential({ title: 'Unlock' })).resolves.toBe('pw');
    expect(setSpy).toHaveBeenCalledWith(SecureKey.BIOMETRIC_PASSWORD, 'pw', { policy: SecureAccessPolicy.BIOMETRIC });
    expect(getSpy).toHaveBeenCalledWith(SecureKey.BIOMETRIC_PASSWORD, { prompt: { title: 'Unlock' } });
  });

  it('propagates biometric cancellation', async () => {
    await repository.saveCredential('pw');
    secureStore.biometricOutcome = BiometricOutcome.CANCEL;
    const error = await repository.readCredential({ title: 't' }).catch(caught => caught);

    expect(isAppError(error, 'BIOMETRICS_CANCELED')).toBe(true);
  });

  it('clear removes the credential', async () => {
    await repository.saveCredential('pw');
    await repository.clear();
    await expect(repository.hasCredential()).resolves.toBe(false);
  });
});

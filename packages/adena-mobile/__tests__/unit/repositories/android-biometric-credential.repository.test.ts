import { isAppError } from '../../../src/core/errors';
import { BIOMETRIC_VAULT_ERROR, Spec } from '../../../src/native/NativeAdenaBiometricVault';
import { AndroidBiometricCredentialRepository } from '../../../src/repositories/android-biometric-credential.repository';
import { MemorySecureStore } from '../../../src/security/memory-secure-store';
import { SecureKey } from '../../../src/security/secure-keys';
import { BiometryKind } from '../../../src/security/secure-store';
import { catchError } from '../../helpers/service-fakes';

const vaultError = (code: string): Error => Object.assign(new Error(code), { code });

const createVault = (): jest.Mocked<Spec> => ({
  seal: jest.fn<Promise<string>, Parameters<Spec['seal']>>(async (_alias, plaintext) => `sealed(${plaintext})`),
  unseal: jest.fn<Promise<string>, Parameters<Spec['unseal']>>(async (_alias, sealed) => sealed.replace(/^sealed\((.*)\)$/, '$1')),
  deleteKey: jest.fn<Promise<void>, Parameters<Spec['deleteKey']>>(async () => undefined),
});

describe('AndroidBiometricCredentialRepository', () => {
  let secureStore: MemorySecureStore;
  let vault: jest.Mocked<Spec>;
  let repository: AndroidBiometricCredentialRepository;

  beforeEach(() => {
    secureStore = new MemorySecureStore();
    vault = createVault();
    repository = new AndroidBiometricCredentialRepository(secureStore, vault);
  });

  it('seals the password with the vault and stores only the ciphertext', async () => {
    const setSpy = jest.spyOn(secureStore, 'setItem');

    await repository.saveCredential('pw');

    expect(vault.seal).toHaveBeenCalledWith('adena.biometric-password', 'pw', 'Turn on biometric unlock', '', 'Cancel');
    expect(setSpy).toHaveBeenCalledWith(SecureKey.BIOMETRIC_PASSWORD, 'bv2:0:sealed(pw)');
    await expect(repository.hasCredential()).resolves.toBe(true);
  });

  it('seals behind the caller prompt when one is given', async () => {
    await repository.saveCredential('pw', { title: 'Use Face ID', subtitle: 'Adena', cancel: 'Later' });

    expect(vault.seal).toHaveBeenCalledWith('adena.biometric-password', 'pw', 'Use Face ID', 'Adena', 'Later');
  });

  it('re-seals under the other key slot and drops the old key only after success', async () => {
    await repository.saveCredential('pw');
    vault.deleteKey.mockClear();
    await repository.saveCredential('pw2');

    expect(vault.seal).toHaveBeenLastCalledWith('adena.biometric-password.b', 'pw2', 'Turn on biometric unlock', '', 'Cancel');
    expect(vault.deleteKey).toHaveBeenCalledWith('adena.biometric-password');
    await expect(repository.readCredential({ title: 'Unlock' })).resolves.toBe('pw2');
    expect(vault.unseal).toHaveBeenLastCalledWith('adena.biometric-password.b', 'sealed(pw2)', 'Unlock', '', 'Cancel');
  });

  it('keeps the previous credential when re-sealing is cancelled', async () => {
    await repository.saveCredential('pw');
    vault.deleteKey.mockClear();
    vault.seal.mockRejectedValueOnce(vaultError(BIOMETRIC_VAULT_ERROR.CANCELED));

    expect((await catchError(() => repository.saveCredential('pw2')) as { code?: string }).code).toBe('BIOMETRICS_CANCELED');
    expect(vault.deleteKey).not.toHaveBeenCalled();
    await expect(repository.readCredential({ title: 'Unlock' })).resolves.toBe('pw');
    expect(vault.unseal).toHaveBeenLastCalledWith('adena.biometric-password', 'sealed(pw)', 'Unlock', '', 'Cancel');
  });

  it('still reads values sealed in the v1 format', async () => {
    await secureStore.setItem(SecureKey.BIOMETRIC_PASSWORD, 'bv1:sealed(old)');

    await expect(repository.readCredential({ title: 'Unlock' })).resolves.toBe('old');
    expect(vault.unseal).toHaveBeenCalledWith('adena.biometric-password', 'sealed(old)', 'Unlock', '', 'Cancel');
    await repository.saveCredential('new');
    expect(vault.seal).toHaveBeenLastCalledWith('adena.biometric-password.b', 'new', 'Turn on biometric unlock', '', 'Cancel');
  });

  it('opens the sealed password behind the given prompt', async () => {
    await repository.saveCredential('pw');

    await expect(repository.readCredential({ title: 'Unlock', subtitle: 'Adena', cancel: 'Not now' })).resolves.toBe('pw');
    expect(vault.unseal).toHaveBeenCalledWith('adena.biometric-password', 'sealed(pw)', 'Unlock', 'Adena', 'Not now');
  });

  it('returns null without a credential', async () => {
    await expect(repository.readCredential({ title: 'Unlock' })).resolves.toBeNull();
    expect(vault.unseal).not.toHaveBeenCalled();
  });

  it('discards a legacy keychain entry instead of trusting it', async () => {
    await secureStore.setItem(SecureKey.BIOMETRIC_PASSWORD, 'plain-password');

    await expect(repository.readCredential({ title: 'Unlock' })).resolves.toBeNull();
    expect(vault.unseal).not.toHaveBeenCalled();
    await expect(repository.hasCredential()).resolves.toBe(false);
    expect(vault.deleteKey).toHaveBeenCalled();
  });

  it('drops the credential when enrollment changes invalidated the key', async () => {
    await repository.saveCredential('pw');
    vault.unseal.mockRejectedValueOnce(vaultError(BIOMETRIC_VAULT_ERROR.KEY_INVALIDATED));

    const error = await catchError(() => repository.readCredential({ title: 'Unlock' }));

    expect(isAppError(error, 'BIOMETRICS_INVALIDATED')).toBe(true);
    await expect(repository.hasCredential()).resolves.toBe(false);
    expect(vault.deleteKey).toHaveBeenCalledWith('adena.biometric-password');
  });

  it.each([
    [BIOMETRIC_VAULT_ERROR.CANCELED, 'BIOMETRICS_CANCELED'],
    [BIOMETRIC_VAULT_ERROR.UNAVAILABLE, 'BIOMETRICS_UNAVAILABLE'],
    [BIOMETRIC_VAULT_ERROR.FAILED, 'STORAGE_ERROR'],
  ])('maps %s and keeps the credential', async (code, expected) => {
    await repository.saveCredential('pw');
    vault.unseal.mockRejectedValueOnce(vaultError(code));

    expect(isAppError(await catchError(() => repository.readCredential({ title: 'Unlock' })), expected as never)).toBe(true);
    await expect(repository.hasCredential()).resolves.toBe(true);
  });

  it('does not store anything when sealing is canceled', async () => {
    vault.seal.mockRejectedValueOnce(vaultError(BIOMETRIC_VAULT_ERROR.CANCELED));

    expect(isAppError(await catchError(() => repository.saveCredential('pw')), 'BIOMETRICS_CANCELED')).toBe(true);
    await expect(repository.hasCredential()).resolves.toBe(false);
  });

  it('clears the stored value and the key, ignoring a missing key', async () => {
    await repository.saveCredential('pw');
    vault.deleteKey.mockRejectedValueOnce(new Error('gone'));

    await repository.clear();
    await expect(repository.hasCredential()).resolves.toBe(false);
  });

  it('fails closed without the native module instead of falling back to the keychain', async () => {
    const missing = new AndroidBiometricCredentialRepository(secureStore, null);

    await expect(missing.getBiometryKind()).resolves.toBeNull();
    expect(isAppError(await catchError(() => missing.saveCredential('pw')), 'BIOMETRICS_UNAVAILABLE')).toBe(true);
    expect(isAppError(await catchError(() => missing.readCredential({ title: 'Unlock' })), 'BIOMETRICS_UNAVAILABLE')).toBe(true);
    await expect(missing.hasCredential()).resolves.toBe(false);
    await missing.clear();
  });

  it('reports the platform biometry kind when the vault exists', async () => {
    await expect(repository.getBiometryKind()).resolves.toBe(BiometryKind.FACE);
  });
});

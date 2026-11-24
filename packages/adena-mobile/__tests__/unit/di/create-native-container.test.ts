import { Platform } from 'react-native';

import * as containerModule from '../../../src/di/container';
import { createNativeContainer, resetNativeGeneralStorage } from '../../../src/di/create-native-container';
import { AndroidBiometricCredentialRepository } from '../../../src/repositories/android-biometric-credential.repository';
import { NativeCloudBackupStore } from '../../../src/repositories/cloud-backup/native-cloud-backup-store';
import { BackupCodec } from '../../../src/security/backup-codec';
import { KeychainSecureStore } from '../../../src/security/keychain-secure-store';
import { createNativeScryptKdf } from '../../../src/security/native-scrypt-kdf';
import { DEFAULT_KDF_SETTINGS, ScryptXChaChaVaultCipher } from '../../../src/security/vault-cipher';
import { createEncryptedMmkvStore, resetEncryptedMmkvStore } from '../../../src/storage/mmkv-key-value-store';

jest.mock('../../../src/security/keychain-secure-store', () => {
  const { MemorySecureStore } = jest.requireActual('../../../src/security/memory-secure-store');

  return {
    KeychainSecureStore: jest.fn().mockImplementation(function (this: unknown, namespace: string) {
      return Object.assign(new MemorySecureStore(), { namespace });
    }),
  };
});

jest.mock('../../../src/security/native-scrypt-kdf', () => ({
  createNativeScryptKdf: jest.fn(),
}));

jest.mock('../../../src/storage/mmkv-key-value-store', () => {
  const { MemoryKeyValueStore } = jest.requireActual('../../../src/storage/memory-key-value-store');

  return {
    createEncryptedMmkvStore: jest.fn(async () => new MemoryKeyValueStore()),
    resetEncryptedMmkvStore: jest.fn(async () => undefined),
  };
});

const createKdf = createNativeScryptKdf as jest.Mock;
const { nobleScryptKdf } = jest.requireActual('../../../src/security/scrypt-kdf');

describe('createNativeContainer', () => {
  beforeEach(() => jest.clearAllMocks());

  it('wires keychain, encrypted storage and native scrypt, then runs migrations', async () => {
    const kdf = { assertWorking: jest.fn(async () => undefined), derive: jest.fn(nobleScryptKdf.derive) };

    createKdf.mockReturnValue(kdf);
    const createSpy = jest.spyOn(containerModule, 'createContainer');
    const container = await createNativeContainer();

    expect(KeychainSecureStore).toHaveBeenCalledWith('adena.wallet');
    expect(kdf.assertWorking).toHaveBeenCalledTimes(1);
    expect(createEncryptedMmkvStore).toHaveBeenCalledWith('adena.general', expect.objectContaining({ namespace: 'adena.wallet' }));
    const infra = createSpy.mock.calls[0][0];

    expect(infra.vaultCipher).toBeInstanceOf(ScryptXChaChaVaultCipher);
    expect(infra.vaultCipher!.needsRehash({ kdf: { name: 'scrypt', ...DEFAULT_KDF_SETTINGS, dkLen: 32, salt: '' } } as never)).toBe(false);
    await expect(container.migrationService.migrateAll()).resolves.toBeDefined();
    createSpy.mockRestore();
  });

  it('uses the Keystore biometric vault only on Android', async () => {
    createKdf.mockReturnValue({ assertWorking: jest.fn(async () => undefined), derive: jest.fn(nobleScryptKdf.derive) });
    const createSpy = jest.spyOn(containerModule, 'createContainer');

    await createNativeContainer();
    expect(createSpy.mock.calls[0][0].biometricRepository).toBeUndefined();
    jest.replaceProperty(Platform, 'OS', 'android');
    await createNativeContainer();
    expect(createSpy.mock.calls[1][0].biometricRepository).toBeInstanceOf(AndroidBiometricCredentialRepository);
    jest.restoreAllMocks();
  });

  it('picks iCloud or Google Drive by platform and stays unavailable without the native module', async () => {
    createKdf.mockReturnValue({ assertWorking: jest.fn(async () => undefined), derive: jest.fn(nobleScryptKdf.derive) });
    const createSpy = jest.spyOn(containerModule, 'createContainer');

    const ios = await createNativeContainer();

    expect(createSpy.mock.calls[0][0].cloudBackupStore).toBeInstanceOf(NativeCloudBackupStore);
    expect(createSpy.mock.calls[0][0].backupCodec).toBeInstanceOf(BackupCodec);
    expect(ios.cloudBackupService.provider).toBe('icloud');
    expect(await ios.cloudBackupService.isAvailable()).toBe(false);
    jest.replaceProperty(Platform, 'OS', 'android');
    expect((await createNativeContainer()).cloudBackupService.provider).toBe('google-drive');
    jest.restoreAllMocks();
  });

  it('fails closed before opening storage when native crypto is missing or wrong', async () => {
    createKdf.mockReturnValue({
      assertWorking: async () => {
        throw new Error('CRYPTO_UNAVAILABLE');
      },
      derive: jest.fn(),
    });

    await expect(createNativeContainer()).rejects.toThrow('CRYPTO_UNAVAILABLE');
    expect(createEncryptedMmkvStore).not.toHaveBeenCalled();
  });

  it('propagates storage open failures', async () => {
    createKdf.mockReturnValue({ assertWorking: jest.fn(async () => undefined), derive: jest.fn() });
    (createEncryptedMmkvStore as jest.Mock).mockRejectedValueOnce(new Error('STORAGE_UNREADABLE'));
    await expect(createNativeContainer()).rejects.toThrow('STORAGE_UNREADABLE');
  });
});

describe('resetNativeGeneralStorage', () => {
  it('resets only the general store with a keychain-backed secure store', async () => {
    await resetNativeGeneralStorage();
    expect(resetEncryptedMmkvStore).toHaveBeenCalledWith('adena.general', expect.objectContaining({ namespace: 'adena.wallet' }));
  });
});

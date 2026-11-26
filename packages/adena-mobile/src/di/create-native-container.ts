import { Platform } from 'react-native';

import { nativeHapticEngine } from '../infrastructure/haptics/native-haptic-engine';
import { createFirebasePushMessaging } from '../infrastructure/push/firebase-push-messaging';
import NativeAdenaBiometricVault from '../native/NativeAdenaBiometricVault';
import NativeAdenaCloudBackup from '../native/NativeAdenaCloudBackup';
import { AndroidBiometricCredentialRepository } from '../repositories/android-biometric-credential.repository';
import { CloudBackupProvider } from '../repositories/cloud-backup/cloud-backup-store';
import { NativeCloudBackupStore } from '../repositories/cloud-backup/native-cloud-backup-store';
import { BACKUP_KDF_SETTINGS, BackupCodec } from '../security/backup-codec';
import { KeychainSecureStore } from '../security/keychain-secure-store';
import { createNativeScryptKdf } from '../security/native-scrypt-kdf';
import { DEFAULT_KDF_SETTINGS, ScryptXChaChaVaultCipher } from '../security/vault-cipher';
import { createEncryptedMmkvStore, resetEncryptedMmkvStore } from '../storage/mmkv-key-value-store';
import { AppContainer, createContainer } from './container';

const SECURE_NAMESPACE = 'adena.wallet';
const STORAGE_ID = 'adena.general';

// Production wiring: keychain-backed secrets, keychain-keyed encrypted MMKV and native scrypt.
export const createNativeContainer = async (): Promise<AppContainer> => {
  const secureStore = new KeychainSecureStore(SECURE_NAMESPACE);
  const kdf = createNativeScryptKdf();

  await kdf.assertWorking();
  const keyValueStore = await createEncryptedMmkvStore(STORAGE_ID, secureStore);
  const container = createContainer({
    secureStore,
    keyValueStore,
    vaultCipher: new ScryptXChaChaVaultCipher(DEFAULT_KDF_SETTINGS, kdf),
    hapticEngine: nativeHapticEngine,
    // iOS keeps react-native-keychain (BIOMETRY_CURRENT_SET is enforced by the Keychain there).
    biometricRepository: Platform.OS === 'android'
      ? new AndroidBiometricCredentialRepository(secureStore, NativeAdenaBiometricVault)
      : undefined,
    cloudBackupStore: new NativeCloudBackupStore(
      NativeAdenaCloudBackup ?? null,
      Platform.OS === 'android' ? CloudBackupProvider.GOOGLE_DRIVE : CloudBackupProvider.ICLOUD,
    ),
    backupCodec: new BackupCodec(new ScryptXChaChaVaultCipher(BACKUP_KDF_SETTINGS, kdf)),
    pushMessaging: createFirebasePushMessaging(),
  });

  await container.migrationService.migrateAll();
  return container;
};

// Recovery for STORAGE_UNREADABLE: wipes general data only; the vault stays.
export const resetNativeGeneralStorage = (): Promise<void> =>
  resetEncryptedMmkvStore(STORAGE_ID, new KeychainSecureStore(SECURE_NAMESPACE));

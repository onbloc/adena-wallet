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
  });

  await container.migrationService.migrateAll();
  return container;
};

// Recovery for STORAGE_UNREADABLE: wipes general data only; the vault stays.
export const resetNativeGeneralStorage = (): Promise<void> =>
  resetEncryptedMmkvStore(STORAGE_ID, new KeychainSecureStore(SECURE_NAMESPACE));

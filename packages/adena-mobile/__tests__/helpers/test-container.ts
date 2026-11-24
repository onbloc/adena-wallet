import { createContainer } from '../../src/di/container';
import { createCosmosModule } from '../../src/repositories/chain/cosmos/cosmos-module';
import { createGnoModule } from '../../src/repositories/chain/gno/gno-module';
import { CloudBackupStore } from '../../src/repositories/cloud-backup/cloud-backup-store';
import { MemoryCloudBackupStore, MemoryCloudBackupStoreOptions } from '../../src/repositories/cloud-backup/memory-cloud-backup-store';
import { BackupCodec } from '../../src/security/backup-codec';
import { MemorySecureStore } from '../../src/security/memory-secure-store';
import { ScryptXChaChaVaultCipher } from '../../src/security/vault-cipher';
import { MemoryKeyValueStore } from '../../src/storage/memory-key-value-store';
import { createFakeGnoProvider } from './fake-gno-provider';
import { FakeHttpClient } from './fake-http';

export const TEST_MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
export const TEST_PASSWORD = 'correct horse battery';
export const API_URL = 'https://api.onbloc.xyz';
export const RESOURCE_BASE = 'https://raw.githubusercontent.com/onbloc/gno-token-resource/main';

// Small scrypt cost so backup tests stay fast; the limits accept it.
export const createTestBackupCodec = (): BackupCodec =>
  new BackupCodec(new ScryptXChaChaVaultCipher({ N: 2 ** 10, r: 8, p: 1 }), { minN: 2 ** 10, maxN: 2 ** 18 });

// Every platform dependency is swapped for an in-memory fake.
// `cloudBackupStoreOverride` swaps the in-memory cloud for another store (e.g. the native adapter over a mock).
export const createTestContainer = (options: { now?: () => number; cloudBackup?: MemoryCloudBackupStoreOptions; cloudBackupStoreOverride?: CloudBackupStore } = {}) => {
  const secureStore = new MemorySecureStore();
  const keyValueStore = new MemoryKeyValueStore();
  const gno = createFakeGnoProvider({ chainId: 'gnoland-1' });
  const http = new FakeHttpClient();
  const cloudBackupStore = new MemoryCloudBackupStore({ now: options.now, ...options.cloudBackup });
  const container = createContainer({
    secureStore,
    keyValueStore,
    http,
    vaultCipher: new ScryptXChaChaVaultCipher({ N: 2 ** 10, r: 8, p: 1 }),
    now: options.now,
    cloudBackupStore: options.cloudBackupStoreOverride ?? cloudBackupStore,
    backupCodec: createTestBackupCodec(),
    chainModules: [createGnoModule({ providerFactory: gno.factory, http }), createCosmosModule({ http })],
  });

  return { container, secureStore, keyValueStore, gno, http, cloudBackupStore };
};

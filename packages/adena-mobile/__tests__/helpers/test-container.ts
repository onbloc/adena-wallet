import { createContainer } from '../../src/di/container';
import { createCosmosModule } from '../../src/repositories/chain/cosmos/cosmos-module';
import { createGnoModule } from '../../src/repositories/chain/gno/gno-module';
import { MemorySecureStore } from '../../src/security/memory-secure-store';
import { ScryptXChaChaVaultCipher } from '../../src/security/vault-cipher';
import { MemoryKeyValueStore } from '../../src/storage/memory-key-value-store';
import { createFakeGnoProvider } from './fake-gno-provider';
import { FakeHttpClient } from './fake-http';

export const TEST_MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
export const TEST_PASSWORD = 'correct horse battery';
export const API_URL = 'https://api.onbloc.xyz';
export const RESOURCE_BASE = 'https://raw.githubusercontent.com/onbloc/gno-token-resource/main';

// Every platform dependency is swapped for an in-memory fake.
export const createTestContainer = (options: { now?: () => number } = {}) => {
  const secureStore = new MemorySecureStore();
  const keyValueStore = new MemoryKeyValueStore();
  const gno = createFakeGnoProvider({ chainId: 'gnoland-1' });
  const http = new FakeHttpClient();
  const container = createContainer({
    secureStore,
    keyValueStore,
    http,
    vaultCipher: new ScryptXChaChaVaultCipher({ N: 2 ** 10, r: 8, p: 1 }),
    now: options.now,
    chainModules: [createGnoModule({ providerFactory: gno.factory, http }), createCosmosModule({ http })],
  });

  return { container, secureStore, keyValueStore, gno, http };
};

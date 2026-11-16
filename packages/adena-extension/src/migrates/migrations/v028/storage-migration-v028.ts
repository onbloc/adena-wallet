import { StorageModel } from '@common/storage';
import { Migration } from '@migrates/migrator';
import { StorageModelDataV027 } from '../v027/storage-model-v027';
import { StorageModelDataV028 } from './storage-model-v028';

/**
 * v028 — point the default gnoland-1 mainnet at rpc.onbloc.xyz. Only an untouched
 * previous default is rewritten; the fallback comes from chains.json, not storage.
 */
const MAINNET_ID = 'gnoland-1';
const OLD_PRIMARY_RPC_URL = 'https://rpc.gno.land:443';
const NEW_PRIMARY_RPC_URL = 'https://rpc.onbloc.xyz:443';

export class StorageMigration028 implements Migration<StorageModelDataV028> {
  public readonly version = 28;

  async up(
    current: StorageModel<StorageModelDataV027>,
  ): Promise<StorageModel<StorageModelDataV028>> {
    if (!this.validateModelV027(current.data)) {
      throw new Error('Storage Data does not match version V027');
    }
    const previous: StorageModelDataV027 = current.data;

    return {
      version: this.version,
      data: {
        ...previous,
        NETWORKS: this.migrateNetworks(previous.NETWORKS),
      },
    };
  }

  private validateModelV027(currentData: StorageModelDataV027): boolean {
    const storageDataKeys = [
      'NETWORKS',
      'CURRENT_CHAIN_ID',
      'CURRENT_NETWORK_ID',
      'SERIALIZED',
      'ENCRYPTED_STORED_PASSWORD',
      'CURRENT_ACCOUNT_ID',
      'ESTABLISH_SITES',
      'ADDRESS_BOOK',
      'ACCOUNT_TOKEN_METAINFOS',
      'ACCOUNT_GRC721_COLLECTIONS',
      'ACCOUNT_GRC721_PINNED_PACKAGES',
      'KDF_SALT',
      'SESSIONS',
    ];
    const currentDataKeys = Object.keys(currentData);
    const hasKeys = storageDataKeys.every((key) => currentDataKeys.includes(key));
    if (!hasKeys) {
      return false;
    }
    if (!Array.isArray(currentData.NETWORKS)) {
      return false;
    }
    if (typeof currentData.CURRENT_CHAIN_ID !== 'string') {
      return false;
    }
    if (typeof currentData.CURRENT_NETWORK_ID !== 'string') {
      return false;
    }
    if (typeof currentData.SERIALIZED !== 'string') {
      return false;
    }
    if (typeof currentData.ENCRYPTED_STORED_PASSWORD !== 'string') {
      return false;
    }
    if (typeof currentData.CURRENT_ACCOUNT_ID !== 'string') {
      return false;
    }
    return true;
  }

  private migrateNetworks(
    networks: StorageModelDataV027['NETWORKS'],
  ): StorageModelDataV028['NETWORKS'] {
    return networks.map((network) => {
      if (network.id !== MAINNET_ID || network.rpcUrl !== OLD_PRIMARY_RPC_URL) {
        return network;
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { fallbackRPCUrl, ...rest } = network;
      return { ...rest, rpcUrl: NEW_PRIMARY_RPC_URL };
    });
  }
}

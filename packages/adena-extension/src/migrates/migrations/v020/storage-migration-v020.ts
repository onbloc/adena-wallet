import { StorageModel } from '@common/storage';
import { Migration } from '@migrates/migrator';
import CHAIN_DATA from '@resources/chains/chains.json';
import { StorageModelDataV019 } from '../v019/storage-model-v019';
import { NetworksModelV020, StorageModelDataV020 } from './storage-model-v020';

export class StorageMigration020 implements Migration<StorageModelDataV020> {
  public readonly version = 20;

  async up(
    current: StorageModel<StorageModelDataV019>,
  ): Promise<StorageModel<StorageModelDataV020>> {
    if (!this.validateModelV019(current.data)) {
      throw new Error('Storage Data does not match version V019');
    }
    const previous: StorageModelDataV019 = current.data;
    return {
      version: this.version,
      data: {
        ...previous,
        NETWORKS: this.migrateNetworks(previous.NETWORKS),
      },
    };
  }

  private validateModelV019(currentData: StorageModelDataV019): boolean {
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
    if (currentData.ACCOUNT_NAMES && typeof currentData.ACCOUNT_NAMES !== 'object') {
      return false;
    }
    if (currentData.ESTABLISH_SITES && typeof currentData.ESTABLISH_SITES !== 'object') {
      return false;
    }
    return true;
  }

  private migrateNetworks(networks: StorageModelDataV019['NETWORKS']): NetworksModelV020 {
    const migrateChainId = 'test-13';

    const changedNetworks = networks.map((network) => {
      if (network.chainId !== migrateChainId) {
        return network;
      }

      const migrateNetwork = CHAIN_DATA.find((chain) => chain.chainId === migrateChainId);
      if (!migrateNetwork) {
        return network;
      }

      return migrateNetwork;
    });

    return changedNetworks;
  }
}

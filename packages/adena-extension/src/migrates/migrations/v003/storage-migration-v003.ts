import { Migration } from '@migrates/migrator';
import { StorageModel } from '@common/storage';
import { NetworksModelV002, StorageModelDataV002 } from '../v002/storage-model-v002';
import { NetworksModelV003, StorageModelDataV003 } from './storage-model-v003';

export class StorageMigration003 implements Migration<StorageModelDataV003> {
  public readonly version = 3;

  async up(
    current: StorageModel<StorageModelDataV002>,
  ): Promise<StorageModel<StorageModelDataV003>> {
    if (!this.validateModelV002(current.data)) {
      throw new Error('Storage Data does not match version V002');
    }
    const previous: StorageModelDataV002 = current.data;
    return {
      version: this.version,
      data: {
        ...previous,
        NETWORKS: this.migrateNetworks(previous.NETWORKS),
      },
    };
  }

  private validateModelV002(currentData: StorageModelDataV002): boolean {
    const storageDataKeys = [
      'NETWORKS',
      'CURRENT_CHAIN_ID',
      'CURRENT_NETWORK_ID',
      'SERIALIZED',
      'ENCRYPTED_STORED_PASSWORD',
      'CURRENT_ACCOUNT_ID',
      'ACCOUNT_NAMES',
      'ESTABLISH_SITES',
      'ADDRESS_BOOK',
      'ACCOUNT_TOKEN_METAINFOS',
    ];
    const hasKeys = Object.keys(currentData).every((dataKey) => storageDataKeys.includes(dataKey));
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
    if (typeof currentData.ACCOUNT_NAMES !== 'object') {
      return false;
    }
    if (typeof currentData.ESTABLISH_SITES !== 'object') {
      return false;
    }
    if (typeof currentData.ADDRESS_BOOK !== 'object') {
      return false;
    }
    return true;
  }

  private migrateNetworks(networksDataV002: NetworksModelV002): NetworksModelV003 {
    const networks = networksDataV002.map((network: any, index) => {
      if (index < 3) {
        return {
          ...network,
          id: network.networkId,
          default: network.main,
        };
      }
      return {
        ...network,
        id: network.networkId || Date.now(),
        default: network.main,
      };
    });
    return networks;
  }
}

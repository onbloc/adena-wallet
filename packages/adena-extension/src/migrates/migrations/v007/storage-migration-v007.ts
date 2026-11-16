import { StorageModel } from '@common/storage';
import { Migration } from '@migrates/migrator';
import { StorageModelDataV006 } from '../v006/storage-model-v006';
import { StorageModelDataV007 } from './storage-model-v007';

export class StorageMigration007 implements Migration<StorageModelDataV007> {
  public readonly version = 7;

  async up(
    current: StorageModel<StorageModelDataV006>,
  ): Promise<StorageModel<StorageModelDataV007>> {
    if (!this.validateModelV006(current.data)) {
      throw new Error('Storage Data does not match version V006');
    }
    const previous: StorageModelDataV006 = current.data;
    return {
      version: this.version,
      data: {
        ...previous,
        ACCOUNT_GRC721_COLLECTIONS: {},
        ACCOUNT_GRC721_PINNED_PACKAGES: {},
      },
    };
  }

  private validateModelV006(currentData: StorageModelDataV006): boolean {
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
    ];
    const currentDataKeys = Object.keys(currentData);
    const hasKeys = storageDataKeys.every((dataKey) => {
      return currentDataKeys.includes(dataKey);
    });

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
}

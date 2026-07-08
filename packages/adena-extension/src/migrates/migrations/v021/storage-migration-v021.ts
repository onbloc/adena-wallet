import { StorageModel } from '@common/storage';
import { Migration } from '@migrates/migrator';
import { StorageModelDataV020 } from '../v020/storage-model-v020';
import { StorageModelDataV021 } from './storage-model-v021';

export class StorageMigration021 implements Migration<StorageModelDataV021> {
  public readonly version = 21;

  async up(
    current: StorageModel<StorageModelDataV020>,
  ): Promise<StorageModel<StorageModelDataV021>> {
    if (!this.validateModelV020(current.data)) {
      throw new Error('Storage Data does not match version V020');
    }
    return {
      version: this.version,
      data: {
        ...current.data,
        SESSIONS: {},
      },
    };
  }

  private validateModelV020(currentData: StorageModelDataV020): boolean {
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
}

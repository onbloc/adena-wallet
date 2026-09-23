import { StorageModel } from '@common/storage';
import { Migration } from '@migrates/migrator';
import { StorageModelDataV027 } from '../v027/storage-model-v027';
import { StorageModelDataV028 } from './storage-model-v028';

/**
 * v028 — add ACCOUNT_GRC721_SYNC, the per-network indexer cursor store.
 *
 * Existing installs start with an empty map, which reads as "never walked" and
 * makes the first NFT read behave exactly as it did before: a full walk that
 * then writes the cursor the next one resumes from.
 */
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
        ACCOUNT_GRC721_SYNC: {},
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
}

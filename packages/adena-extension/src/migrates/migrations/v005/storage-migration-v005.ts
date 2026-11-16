import { Migration } from '@migrates/migrator';
import { StorageModel } from '@common/storage';
import { StorageModelDataV004 } from '../v004/storage-model-v004';
import { AddressBookModelV005, StorageModelDataV005 } from './storage-model-v005';

export class StorageMigration005 implements Migration<StorageModelDataV005> {
  public readonly version = 5;

  async up(
    current: StorageModel<StorageModelDataV004>,
  ): Promise<StorageModel<StorageModelDataV005>> {
    if (!this.validateModelV004(current.data)) {
      throw new Error('Storage Data does not match version V004');
    }
    const previous: StorageModelDataV004 = current.data;
    return {
      version: this.version,
      data: {
        ...previous,
        QUESTIONNAIRE_EXPIRED_DATE: null,
        ADDRESS_BOOK: this.migrateAddressBook(),
        WALLET_CREATION_GUIDE_CONFIRM_DATE: null,
        ADD_ACCOUNT_GUIDE_CONFIRM_DATE: null,
      },
    };
  }

  private validateModelV004(currentData: StorageModelDataV004): boolean {
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
      'QUESTIONNAIRE_EXPIRED_DATE',
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
    if (currentData.ACCOUNT_NAMES && typeof currentData.ACCOUNT_NAMES !== 'object') {
      return false;
    }
    if (currentData.ESTABLISH_SITES && typeof currentData.ESTABLISH_SITES !== 'object') {
      return false;
    }
    return true;
  }

  /**
   * Change to save data as encrypted.
   * When migrating, set string defaults.
   */
  private migrateAddressBook(): AddressBookModelV005 {
    return '' as AddressBookModelV005;
  }
}

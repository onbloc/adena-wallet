import { decryptAES, encryptAES } from 'adena-module';
import { StorageModel } from '@common/storage';
import { Migration } from '@migrates/migrator';
import {
  AccountDataModelV014,
  KeyringDataModelV014,
  WalletModelV014,
  StorageModelDataV014,
} from '../v014/storage-model-v014';
import {
  AccountDataModelV015,
  KeyringDataModelV015,
  WalletModelV015,
  StorageModelDataV015,
} from './storage-model-v015';

export class StorageMigration015 implements Migration<StorageModelDataV015> {
  public readonly version = 15;

  async up(
    current: StorageModel<StorageModelDataV014>,
    password?: string,
  ): Promise<StorageModel<StorageModelDataV015>> {
    if (!this.validateModelV014(current.data)) {
      throw new Error('Storage Data does not match version V014');
    }
    const previous: StorageModelDataV014 = current.data;
    return {
      version: this.version,
      data: {
        ...previous,
        SERIALIZED: await this.migrateWallet(previous.SERIALIZED, password),
      },
    };
  }

  private validateModelV014(currentData: StorageModelDataV014): boolean {
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

  private async migrateWallet(serialized: string, password?: string): Promise<string> {
    if (!password) {
      return serialized;
    }

    try {
      const decrypted = await decryptAES(serialized, password);

      if (!decrypted || decrypted.trim() === '') {
        console.warn('Decryption resulted in empty string');
        return serialized;
      }

      const wallet: WalletModelV014 = JSON.parse(decrypted);

      const migrated: WalletModelV015 = {
        ...wallet,
        accounts: wallet.accounts.map((account) => this.migrateAccount(account)),
        keyrings: wallet.keyrings.map((keyring) => this.migrateKeyring(keyring)),
      };

      const json = JSON.stringify(migrated);
      const encrypted = await encryptAES(json, password);
      return encrypted;
    } catch (error) {
      console.error('Failed to migrate wallet:', error);
      return serialized;
    }
  }

  private migrateAccount(account: AccountDataModelV014): AccountDataModelV015 {
    return account as AccountDataModelV015;
  }

  private migrateKeyring(keyring: KeyringDataModelV014): KeyringDataModelV015 {
    return keyring as KeyringDataModelV015;
  }
}

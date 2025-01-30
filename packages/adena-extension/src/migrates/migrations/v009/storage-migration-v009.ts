import { StorageModel } from '@common/storage';
import { Migration } from '@migrates/migrator';
import { AdenaWallet, decryptAES, mnemonicToEntropy } from 'adena-module';
import {
  SerializedModelV008,
  StorageModelDataV008,
  WalletModelV008,
} from '../v008/storage-model-v008';
import { SerializedModelV009, StorageModelDataV009 } from './storage-model-v009';

export class StorageMigration009 implements Migration<StorageModelDataV009> {
  public readonly version = 9;

  async up(
    current: StorageModel<StorageModelDataV008>,
    password?: string,
  ): Promise<StorageModel<StorageModelDataV009>> {
    if (!password) {
      return current;
    }

    if (!this.validateModelV008(current.data)) {
      throw new Error('Storage Data does not match version V009');
    }
    const previous: StorageModelDataV008 = current.data;
    const serialized = await this.migrateSerialized(previous.SERIALIZED, password || '');
    return {
      version: this.version,
      data: {
        ...previous,
        SERIALIZED: serialized,
      },
    };
  }

  private validateModelV008(currentData: StorageModelDataV008): boolean {
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

  private async migrateSerialized(
    serialized: SerializedModelV008,
    password: string,
  ): Promise<SerializedModelV009> {
    if (!password || !serialized) {
      return '';
    }

    let decrypted = await decryptAES(serialized, password);
    let wallet = JSON.parse(decrypted) as WalletModelV008;

    let keyrings = wallet.keyrings.map((keyring) => {
      if (keyring.type === 'HD_WALLET' && keyring.mnemonic) {
        return {
          id: keyring.id,
          type: keyring.type,
          seed: keyring.seed,
          mnemonicEntropy: Array.from(mnemonicToEntropy(keyring.mnemonic)),
        };
      }

      return keyring;
    });

    let changedWallet = new AdenaWallet({
      accounts: wallet.accounts,
      keyrings: keyrings,
      currentAccountId: wallet.currentAccountId,
    });

    const serializedWallet = await changedWallet.serialize(password);

    keyrings = [];
    wallet = { accounts: [], keyrings: [] };
    decrypted = '';
    changedWallet = new AdenaWallet();

    return serializedWallet;
  }
}

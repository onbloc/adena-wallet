import { Migration } from '@migrates/migrator';
import { StorageModel } from '@common/storage';
import {
  AccountTokenMetainfoModelV001,
  AddressBookModelV001,
  StorageModelDataV001,
  WalletModelV001,
} from '../v001/storage-model-v001';
import {
  AccountTokenMetainfoModelV002,
  AddressBookModelV002,
  StorageModelDataV002,
  WalletModelV002,
} from './storage-model-v002';
import { decryptAES, encryptAES } from 'adena-module';

export class StorageMigration002 implements Migration<StorageModelDataV002> {
  public readonly version = 2;

  async up(
    current: StorageModel<StorageModelDataV001>,
    password?: string,
  ): Promise<StorageModel<StorageModelDataV002>> {
    if (!this.validateModelV001(current.data)) {
      throw new Error('Stroage Data doesn not match version V001');
    }
    const previous: StorageModelDataV001 = current.data;
    return {
      version: this.version,
      data: {
        ...previous,
        ADDRESS_BOOK: this.migrateAddressBook(previous.ADDRESS_BOOK),
        SERIALIZED: await this.migrateWallet(previous.SERIALIZED, password),
        ACCOUNT_TOKEN_METAINFOS: this.migrateAccountTokenMetainfos(
          previous.ACCOUNT_TOKEN_METAINFOS,
        ),
      },
    };
  }

  private validateModelV001(currentData: StorageModelDataV001): boolean {
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

  private migrateAddressBook(addressBookDataV001: AddressBookModelV001): AddressBookModelV002 {
    const addressBooks = Object.keys(addressBookDataV001).flatMap(
      (key) => addressBookDataV001[key],
    );
    const result = addressBooks.filter(
      (addressBook, index, callback) =>
        index === callback.findIndex((compare) => compare.address === addressBook.address),
    );
    return result;
  }

  private async migrateWallet(serialized: string, password?: string): Promise<string> {
    if (password) {
      const decrypted = await decryptAES(serialized, password);
      const wallet: WalletModelV001 = JSON.parse(decrypted);
      const migrated: WalletModelV002 = {
        ...wallet,
      };
      const json = JSON.stringify(migrated);
      const encrypted = await encryptAES(json, password);
      return encrypted;
    }
    return serialized;
  }

  private migrateAccountTokenMetainfos(
    accountTokenMetainfo: AccountTokenMetainfoModelV001,
  ): AccountTokenMetainfoModelV002 {
    const changed: AccountTokenMetainfoModelV002 = {};
    for (const accountId of Object.keys(accountTokenMetainfo)) {
      changed[accountId] = accountTokenMetainfo[accountId].map((tokenMetaInfo) => {
        const {
          main,
          tokenId,
          image,
          pkgPath,
          type,
          name,
          decimals,
          denom,
          minimalDenom,
          display,
        } = tokenMetaInfo;
        return {
          main,
          tokenId,
          display: display === true,
          type: type === 'NATIVE' ? 'gno-native' : 'grc20',
          name,
          symbol: denom,
          decimals,
          description: '',
          websiteUrl: '',
          image: image ?? '',
          denom: minimalDenom,
          pkgPath: pkgPath,
        };
      });
    }
    return changed;
  }
}

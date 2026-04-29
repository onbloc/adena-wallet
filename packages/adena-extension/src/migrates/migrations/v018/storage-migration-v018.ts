import { decryptAES, encryptXChacha20, generateKdfSalt } from 'adena-module';
import CryptoJS from 'crypto-js';
import { StorageModel } from '@common/storage';
import { Migration } from '@migrates/migrator';
import { StorageModelDataV017 } from '../v017/storage-model-v017';
import { StorageModelDataV018 } from './storage-model-v018';

const LEGACY_SALT = 'W9+fs3FJ9p5KdR1XzQy2A6ZT4vjN8LvM9J8pVZmN9rU=';
const legacyHashPassword = (password: string): string =>
  CryptoJS.SHA256(LEGACY_SALT + password).toString();

export class StorageMigration018 implements Migration<StorageModelDataV018> {
  public readonly version = 18;

  async up(
    current: StorageModel<StorageModelDataV017>,
    password?: string,
  ): Promise<StorageModel<StorageModelDataV018>> {
    if (!this.validateModelV017(current.data)) {
      throw new Error('Storage Data does not match version V017');
    }
    const previous: StorageModelDataV017 = current.data;
    const salt = await generateKdfSalt();
    const saltBase64 = Buffer.from(salt).toString('base64');
    // After v009, SERIALIZED is encrypted with SHA256(LEGACY_SALT + rawPassword)
    // We decrypt with the hashed password but re-encrypt with raw password for the new system
    const hashedPassword = password ? legacyHashPassword(password) : undefined;
    return {
      version: this.version,
      data: {
        ...previous,
        SERIALIZED: await this.migrateSerialized(
          previous.SERIALIZED,
          hashedPassword,
          password,
          salt,
        ),
        ADDRESS_BOOK: await this.migrateAddressBook(
          previous.ADDRESS_BOOK,
          hashedPassword,
          password,
          salt,
        ),
        KDF_SALT: saltBase64,
      },
    };
  }

  private validateModelV017(currentData: StorageModelDataV017): boolean {
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
    serialized: string,
    oldPassword: string | undefined,
    newPassword: string | undefined,
    salt: Uint8Array,
  ): Promise<string> {
    // Empty SERIALIZED means there is no wallet to migrate (fresh install).
    if (!serialized) {
      return serialized;
    }

    // Existing wallet exists but caller did not supply a password — refuse
    // to bump version. Throwing propagates to StorageMigrator.migrate which
    // backs up and returns null, so chrome.storage stays at v017 untouched.
    if (!oldPassword || !newPassword) {
      throw new Error(
        'V018 migration requires a password to re-encrypt existing SERIALIZED data',
      );
    }

    // Wrong password surfaces in two shapes from decryptAES: an empty string
    // when PKCS#7 padding happens to validate but produces no plaintext, or a
    // CryptoJS "Malformed UTF-8 data" throw when the bytes cannot be decoded.
    // Normalize both into a single error so the migrator preserves v017 state.
    let plaintext: string;
    try {
      plaintext = await decryptAES(serialized, oldPassword);
    } catch {
      throw new Error('V018 migration failed: cannot decrypt SERIALIZED with given password');
    }
    if (!plaintext || plaintext.trim() === '') {
      throw new Error('V018 migration failed: cannot decrypt SERIALIZED with given password');
    }

    const encrypted = await encryptXChacha20(plaintext, newPassword, salt);
    return JSON.stringify(encrypted);
  }

  private async migrateAddressBook(
    addressBook: string,
    oldPassword: string | undefined,
    newPassword: string | undefined,
    salt: Uint8Array,
  ): Promise<string> {
    // ADDRESS_BOOK is optional — no entries means nothing to migrate.
    if (!addressBook) {
      return addressBook;
    }

    if (!oldPassword || !newPassword) {
      throw new Error(
        'V018 migration requires a password to re-encrypt existing ADDRESS_BOOK data',
      );
    }

    let plaintext: string;
    try {
      plaintext = await decryptAES(addressBook, oldPassword);
    } catch {
      throw new Error('V018 migration failed: cannot decrypt ADDRESS_BOOK with given password');
    }
    if (!plaintext || plaintext.trim() === '') {
      throw new Error('V018 migration failed: cannot decrypt ADDRESS_BOOK with given password');
    }

    const encrypted = await encryptXChacha20(plaintext, newPassword, salt);
    return JSON.stringify(encrypted);
  }
}

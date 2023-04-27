import { WalletError } from '@common/errors';
import { StorageManager } from '@common/storage/storage-manager';
import {
  encryptPassword,
  decryptPassword,
  encryptSha256Password,
} from '@common/utils/crypto-utils';

type LocalValueType = 'SERIALIZED' | 'ENCRYPTED_STORED_PASSWORD';
type SessionValueType = 'ENCRYPTED_KEY' | 'ENCRYPTED_PASSWORD';

export class WalletRepository {
  private localStorage: StorageManager<LocalValueType>;

  private sessionStorage: StorageManager<SessionValueType>;

  constructor(localStorage: StorageManager, sessionStorage: StorageManager) {
    this.localStorage = localStorage;
    this.sessionStorage = sessionStorage;
  }

  public getSerializedWallet = async () => {
    const serializedWallet = await this.localStorage.get('SERIALIZED');
    if (!serializedWallet || serializedWallet === '') {
      throw new WalletError('NOT_FOUND_SERIALIZED');
    }
    return serializedWallet;
  };

  public updateSerializedWallet = async (serializedWallet: string) => {
    await this.localStorage.set('SERIALIZED', serializedWallet);
    return true;
  };

  public deleteSerializedWallet = async () => {
    await this.localStorage.remove('SERIALIZED');
    return true;
  };

  public existsWalletPassword = async () => {
    try {
      const password = await this.getWalletPassword();
      if (password === '') {
        throw new WalletError('NOT_FOUND_PASSWORD');
      }
    } catch (e) {
      return false;
    }

    return true;
  };

  public getWalletPassword = async () => {
    const encryptedKey = await this.sessionStorage.get('ENCRYPTED_KEY');
    const encryptedPassword = await this.sessionStorage.get('ENCRYPTED_PASSWORD');

    if (encryptedKey === '' || encryptedPassword === '') {
      throw new WalletError('NOT_FOUND_PASSWORD');
    }

    try {
      return decryptPassword(encryptedKey, encryptedPassword);
    } catch (e) {
      throw new WalletError('NOT_FOUND_PASSWORD');
    }
  };

  public updateWalletPassword = async (password: string) => {
    const { encryptedKey, encryptedPassword } = encryptPassword(password);
    const storedPassword = encryptSha256Password(password);
    await this.localStorage.set('ENCRYPTED_STORED_PASSWORD', storedPassword);
    await this.sessionStorage.set('ENCRYPTED_KEY', encryptedKey);
    await this.sessionStorage.set('ENCRYPTED_PASSWORD', encryptedPassword);
    return true;
  };

  public deleteWalletPassword = async () => {
    await this.sessionStorage.remove('ENCRYPTED_KEY');
    await this.sessionStorage.remove('ENCRYPTED_PASSWORD');
    return true;
  };

  public getEncryptedPassword = async () => {
    const encryptedPassword = await this.localStorage.get('ENCRYPTED_STORED_PASSWORD');
    return encryptedPassword;
  };
}

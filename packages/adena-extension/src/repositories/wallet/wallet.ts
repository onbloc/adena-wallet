import { WalletError } from '@common/errors';
import { StorageManager } from '@common/storage/storage-manager';
import {
  encryptPassword,
  decryptPassword,
  encryptSha256Password,
} from '@common/utils/crypto-utils';

type LocalValueType =
  | 'SERIALIZED'
  | 'ENCRYPTED_STORED_PASSWORD'
  | 'QUESTIONNAIRE_EXPIRED_DATE'
  | 'WALLET_CREATION_GUIDE_CONFIRM_DATE'
  | 'ADD_ACCOUNT_GUIDE_CONFIRM_DATE';
type SessionValueType = 'ENCRYPTED_KEY' | 'ENCRYPTED_PASSWORD';

export class WalletRepository {
  private localStorage: StorageManager<LocalValueType>;

  private sessionStorage: StorageManager<SessionValueType>;

  constructor(localStorage: StorageManager, sessionStorage: StorageManager) {
    this.localStorage = localStorage;
    this.sessionStorage = sessionStorage;
  }

  public getSerializedWallet = async (): Promise<string> => {
    const serializedWallet = await this.localStorage.get('SERIALIZED');
    if (!serializedWallet || serializedWallet === '') {
      throw new WalletError('NOT_FOUND_SERIALIZED');
    }
    return serializedWallet;
  };

  public updateSerializedWallet = async (serializedWallet: string): Promise<boolean> => {
    await this.localStorage.set('SERIALIZED', serializedWallet);
    return true;
  };

  public deleteSerializedWallet = async (): Promise<boolean> => {
    await this.localStorage.remove('SERIALIZED');
    await this.localStorage.remove('ENCRYPTED_STORED_PASSWORD');
    await this.localStorage.remove('QUESTIONNAIRE_EXPIRED_DATE');
    return true;
  };

  public existsWalletPassword = async (): Promise<boolean> => {
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

  public getWalletPassword = async (): Promise<string> => {
    const encryptedKey = await this.sessionStorage.get('ENCRYPTED_KEY');
    const encryptedPassword = await this.sessionStorage.get('ENCRYPTED_PASSWORD');

    if (encryptedKey === '' || encryptedPassword === '') {
      throw new WalletError('NOT_FOUND_PASSWORD');
    }

    try {
      const password = decryptPassword(encryptedKey, encryptedPassword);
      this.updateStoragePassword(password);
      return password;
    } catch (e) {
      throw new WalletError('NOT_FOUND_PASSWORD');
    }
  };

  public updateWalletPassword = async (password: string): Promise<boolean> => {
    const { encryptedKey, encryptedPassword } = encryptPassword(password);
    const storedPassword = encryptSha256Password(password);
    this.updateStoragePassword(password);
    await this.localStorage.set('ENCRYPTED_STORED_PASSWORD', storedPassword);
    await this.sessionStorage.set('ENCRYPTED_KEY', encryptedKey);
    await this.sessionStorage.set('ENCRYPTED_PASSWORD', encryptedPassword);
    return true;
  };

  public deleteWalletPassword = async (): Promise<boolean> => {
    await this.sessionStorage.remove('ENCRYPTED_KEY');
    await this.sessionStorage.remove('ENCRYPTED_PASSWORD');
    return true;
  };

  public getEncryptedPassword = async (): Promise<string> => {
    const encryptedPassword = await this.localStorage.get('ENCRYPTED_STORED_PASSWORD');
    return encryptedPassword;
  };

  public updateStoragePassword = (password: string): void => {
    this.localStorage.updatePassword(password);
  };

  public getQuestionnaireExpiredDate = async (): Promise<number | null> => {
    const expiredDateTime = await this.localStorage.get('QUESTIONNAIRE_EXPIRED_DATE');
    if (!expiredDateTime) {
      return null;
    }
    return Number(expiredDateTime);
  };

  public updatedQuestionnaireExpiredDate = async (expiredDateTime: number): Promise<void> => {
    await this.localStorage.set('QUESTIONNAIRE_EXPIRED_DATE', expiredDateTime);
  };

  public getWalletCreationGuideConfirmDate = async (): Promise<number | null> => {
    const confirmDate = await this.localStorage.get('WALLET_CREATION_GUIDE_CONFIRM_DATE');
    if (!confirmDate) {
      return null;
    }
    return Number(confirmDate);
  };

  public updateWalletCreationGuideConfirmDate = async (confirmDate: number): Promise<void> => {
    await this.localStorage.set('WALLET_CREATION_GUIDE_CONFIRM_DATE', confirmDate);
  };

  public getAddAccountGuideConfirmDate = async (): Promise<number | null> => {
    const confirmDate = await this.localStorage.get('ADD_ACCOUNT_GUIDE_CONFIRM_DATE');
    if (!confirmDate) {
      return null;
    }
    return Number(confirmDate);
  };

  public updateAddAccountGuideConfirmDate = async (confirmDate: number): Promise<void> => {
    await this.localStorage.set('ADD_ACCOUNT_GUIDE_CONFIRM_DATE', confirmDate);
  };
}

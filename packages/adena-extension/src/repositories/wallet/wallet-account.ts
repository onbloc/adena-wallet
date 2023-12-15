import { StorageManager } from '@common/storage/storage-manager';

type LocalValueType = 'CURRENT_ACCOUNT_ID' | 'ACCOUNT_NAMES';

export class WalletAccountRepository {
  private localStorage: StorageManager<LocalValueType>;

  constructor(localStorage: StorageManager) {
    this.localStorage = localStorage;
  }

  public getCurrentAccountId = async (): Promise<string> => {
    const currentAccountId = await this.localStorage.get('CURRENT_ACCOUNT_ID');
    return currentAccountId;
  };

  public updateCurrentAccountId = async (accountId: string): Promise<boolean> => {
    await this.localStorage.set('CURRENT_ACCOUNT_ID', accountId);
    return true;
  };

  public deleteCurrentAccountId = async (): Promise<boolean> => {
    await this.localStorage.remove('CURRENT_ACCOUNT_ID');
    return true;
  };

  public getAccountNames = async (): Promise<{ [x: string]: string }> => {
    const accountNames = await this.localStorage.getToObject<{ [key in string]: string }>(
      'ACCOUNT_NAMES',
    );
    return accountNames;
  };

  public updateAccountNames = async (accountNames: {
    [key in string]: string;
  }): Promise<boolean> => {
    await this.localStorage.setByObject('ACCOUNT_NAMES', accountNames);
    return true;
  };

  public deleteAccountNameByAccountId = async (accountId: string): Promise<boolean> => {
    const accountNames = await this.getAccountNames();
    try {
      delete accountNames[accountId];
    } catch (e) {
      console.error(e);
    }
    await this.localStorage.setByObject('ACCOUNT_NAMES', accountNames);
    return true;
  };

  public deleteAccountNames = async (): Promise<boolean> => {
    await this.localStorage.setByObject('ACCOUNT_NAMES', {});
    return true;
  };
}

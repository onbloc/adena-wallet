import { StorageManager } from '@common/storage/storage-manager';

type LocalValueType = 'CURRENT_ACCOUNT_ID';

export class WalletAccountRepository {
  private localStorage: StorageManager<LocalValueType>;

  constructor(localStorage: StorageManager) {
    this.localStorage = localStorage;
  }

  public getCurrentAccountId = async () => {
    const currentAccountId = await this.localStorage.get('CURRENT_ACCOUNT_ID');
    return currentAccountId;
  };

  public updateCurrentAccountId = async (accountId: string) => {
    await this.localStorage.set('CURRENT_ACCOUNT_ID', accountId);
    return true;
  };

  public deleteCurrentAccountId = async () => {
    await this.localStorage.remove('CURRENT_ACCOUNT_ID');
    return true;
  };
}

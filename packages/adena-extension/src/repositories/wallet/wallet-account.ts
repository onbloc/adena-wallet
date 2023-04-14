import { StorageManager } from '@common/storage/storage-manager';
import { Account, LedgerAccount, SeedAccount, SingleAccount } from 'adena-module';
import { deserializeAccount, serializeAccount } from 'adena-module';

type LocalValueType =
  | 'WALLET_ACCOUNT_PATH'
  | 'WALLET_ACCOUNT_NAMES'
  | 'CURRENT_ACCOUNT_ADDRESS'
  | 'CURRENT_ACCOUNT_INDEX'
  | 'ADDRESS_BOOK'
  | 'WALLET_ACCOUNTS'
  | 'CURRENT_CHAIN_ID'
  | 'ESTABLISH_SITES';

export class WalletAccountRepository {
  private localStorage: StorageManager<LocalValueType>;

  constructor(localStorage: StorageManager) {
    this.localStorage = localStorage;
  }

  public getCurrentAccountAddress = async () => {
    const currentAccountAddress = await this.localStorage.get('CURRENT_ACCOUNT_ADDRESS');
    return currentAccountAddress;
  };

  public updateCurrentAccountAddress = async (address: string) => {
    await this.localStorage.set('CURRENT_ACCOUNT_ADDRESS', address);
    return true;
  };

  public deleteCurrentAccountAddress = async () => {
    await this.localStorage.remove('CURRENT_ACCOUNT_ADDRESS');
    return true;
  };

  public getAccounts = async () => {
    const serializedAccounts = await this.localStorage.getToObject('WALLET_ACCOUNTS');
    if (!Array.isArray(serializedAccounts)) {
      return [];
    }

    const accounts = serializedAccounts
      .map((serializedAccount) => {
        try {
          const account: LedgerAccount | SeedAccount | SingleAccount = deserializeAccount(
            serializedAccount,
          );
          return account;
        } catch (e) {
          return null;
        }
      })
      .filter((account) => account !== null);
    return accounts as Array<LedgerAccount | SeedAccount | SingleAccount>;
  };

  public updateAccounts = async (walletAccounts: Array<Account>) => {
    const serializedAccounts = walletAccounts.map((account) => serializeAccount(account));
    await this.localStorage.setByObject('WALLET_ACCOUNTS', serializedAccounts);
    return true;
  };

  public deleteAccounts = async () => {
    await this.localStorage.remove('WALLET_ACCOUNTS');
    return true;
  };

  public getAccountPath = async () => {
    const accountPath = await this.localStorage.get('WALLET_ACCOUNT_PATH');
    if (accountPath === '') {
      return 0;
    }
    return parseInt(accountPath);
  };

  public updateAccountPath = async (accountPath: number) => {
    await this.localStorage.set('WALLET_ACCOUNT_PATH', `${accountPath}`);
    return true;
  };

  public deleteAccountPath = async () => {
    await this.localStorage.remove('WALLET_ACCOUNT_PATH');
    return true;
  };

  public getAccountNames = async () => {
    const accountNames = await this.localStorage.getToObject('WALLET_ACCOUNT_NAMES');
    return accountNames;
  };

  public updateAccountNames = async (accountNames: { [key in string]: string }) => {
    await this.localStorage.setByObject('WALLET_ACCOUNT_NAMES', accountNames);
    return true;
  };

  public deleteAccountNames = async () => {
    await this.localStorage.remove('WALLET_ACCOUNT_NAMES');
    return true;
  };

  public getCurrentAccountIndex = async () => {
    const index = await this.localStorage.get('CURRENT_ACCOUNT_INDEX');
    return parseInt(index);
  };

  public updateCurrentAccountIndex = async (index: string | number) => {
    await this.localStorage.set('WALLET_ACCOUNT_NAMES', `${index}`);
    return true;
  };

  public deleteCurrentAccountIndex = async () => {
    await this.localStorage.remove('WALLET_ACCOUNT_NAMES');
    return true;
  };
}

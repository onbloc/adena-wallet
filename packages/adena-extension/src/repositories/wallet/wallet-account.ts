import { StorageManager } from "@common/storage/storage-manager";
import { WalletAccount } from "adena-module";

type LocalValueType =
  | 'WALLET_ACCOUNT_PATHS'
  | 'WALLET_ACCOUNT_NAMES'
  | 'CURRENT_ACCOUNT_ADDRESS'
  | 'ADDRESS_BOOK'
  | 'WALLET_ACCOUNTS'
  | 'CURRENT_CHAIN_ID'
  | 'ESTABLISH_SITES';

export class WalletAccountRepository {

  private localStorage: StorageManager<LocalValueType>;

  constructor(localStorage: StorageManager) {
    this.localStorage = localStorage;
  }

  public getCurrentAccountAddress = async (
  ) => {
    const currentAccountAddress = await this.localStorage.get('CURRENT_ACCOUNT_ADDRESS');
    return currentAccountAddress;
  };

  public updateCurrentAccountAddress = async (address: string) => {
    await this.localStorage.set('CURRENT_ACCOUNT_ADDRESS', address);
    return true;
  };

  public getAccounts = async () => {
    const serializedAccounts = await this.localStorage.getToObject('WALLET_ACCOUNTS');
    if (!Array.isArray(serializedAccounts)) {
      return [];
    }

    const accounts = serializedAccounts.map(serializedAccount => {
      try {
        const account = WalletAccount.deserialize(serializedAccount);
        return account;
      } catch (e) {
        return null;
      }
    }).filter(account => account !== null);
    return accounts as Array<InstanceType<typeof WalletAccount>>;
  };

  public updateAccounts = async (walletAccounts: Array<InstanceType<typeof WalletAccount>>) => {
    const serializedAccounts = walletAccounts.map(account => account.serialize());
    await this.localStorage.setByObject('WALLET_ACCOUNTS', serializedAccounts);
  };

  public getAccountPaths = async () => {
    const accountPaths = await this.localStorage.getToNumbers('WALLET_ACCOUNT_PATHS');
    if (accountPaths.length === 0) {
      return [0];
    }
    return accountPaths;
  };

  public updateAccountPaths = async (accountPaths: Array<number>) => {
    await this.localStorage.setByNumbers('WALLET_ACCOUNT_PATHS', accountPaths);
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

  public deleteAccounts = async () => {
    await this.localStorage.remove('CURRENT_ACCOUNT_ADDRESS');
    await this.localStorage.remove('WALLET_ACCOUNTS');
    await this.localStorage.remove('WALLET_ACCOUNT_NAMES');
    await this.localStorage.remove('WALLET_ACCOUNT_PATHS');
    await this.localStorage.remove('CURRENT_CHAIN_ID');
    await this.localStorage.remove('ESTABLISH_SITES');
  }
}

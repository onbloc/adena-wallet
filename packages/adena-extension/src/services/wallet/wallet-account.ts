import { GnoClient } from 'gno-client';
import { WalletAccountRepository } from '@repositories/wallet';
import { WalletError } from '@common/errors';
import { isLedgerAccount } from 'adena-module';
import { Account } from 'adena-module';

export class WalletAccountService {
  private gnoClient: InstanceType<typeof GnoClient> | null;

  private walletAccountRepository: WalletAccountRepository;

  constructor(
    gnoClient: InstanceType<typeof GnoClient> | null,
    walletAccountRepository: WalletAccountRepository,
  ) {
    this.gnoClient = gnoClient;
    this.walletAccountRepository = walletAccountRepository;
  }

  public setGnoClient(gnoClient: InstanceType<typeof GnoClient>) {
    this.gnoClient = gnoClient;
  }

  public getCurrentAccount = async () => {
    const accounts = await this.getAccounts();
    if (accounts.length === 0) {
      throw new WalletError('NOT_FOUND_ACCOUNT');
    }
    console.log('accounts', accounts);
    console.log('accountType', accounts[0]);
    const currentAccountAddress = await this.walletAccountRepository.getCurrentAccountAddress();
    const currentAccount =
      accounts.find((account) => account.getAddress('g') === currentAccountAddress) ?? accounts[0];
    console.log('currentAccount', currentAccount);
    await this.updateCurrentAccount(currentAccount);
    return currentAccount;
  };

  public getCurrentAccountIndex = async () => {
    const currentIndex = await this.walletAccountRepository.getCurrentAccountIndex();
    return Number.isNaN(currentIndex) ? 0 : currentIndex;
  };

  public getCurrentAccountAddress = async () => {
    try {
      const currentAccount = await this.getCurrentAccount();
      return currentAccount.getAddress('g');
    } catch (e) {
      return '';
    }
  };

  public updateCurrentAccount = async (currentAccount: Account) => {
    const accounts = await this.getAccounts();
    const changedAccounts = accounts.map((account) => {
      if (
        account.getAddress('g') === currentAccount.getAddress('g') &&
        account.index === currentAccount.index &&
        account.type === currentAccount.type
      ) {
        return currentAccount;
      }
      return account;
    });
    await this.walletAccountRepository.updateCurrentAccountIndex(currentAccount.index);
    await this.walletAccountRepository.updateCurrentAccountAddress(currentAccount.getAddress('g'));
    await this.updateAccounts(changedAccounts);
    return true;
  };

  public changeCurrentAccount = async (account: Account) => {
    await this.walletAccountRepository.updateCurrentAccountIndex(account.index);
    await this.walletAccountRepository.updateCurrentAccountAddress(account.getAddress('g'));
    return true;
  };

  public existsAccounts = async () => {
    const accounts = await this.getAccounts();
    return accounts.length > 0;
  };

  /**
   * This function loads accounts in the wallet.
   *
   * @param wallet Wallet instnace
   * @returns Account instances
   */
  public getAccounts = async () => {
    const accounts = await this.walletAccountRepository.getAccounts();
    return accounts;
  };

  /**
   * This function saves accounts in the wallet.
   *
   * @param accounts Wallet instnace arrays
   */
  public updateAccounts = async (accounts: Array<Account>) => {
    await this.walletAccountRepository.updateAccounts(accounts);
    return true;
  };

  /**
   *
   * @param account s
   * @returns
   */
  public addAccount = async (account: Account) => {
    const accounts = await this.walletAccountRepository.getAccounts();
    await this.walletAccountRepository.updateAccounts([...accounts, account]);
    await this.walletAccountRepository.updateCurrentAccountIndex(account.index);
    return true;
  };

  public deleteAccount = async (account: Account) => {
    const equalsAccount = (account1: Account, account2: Account) => {
      return (
        account1.getAddress('g') === account2.getAddress('g') &&
        account1.type === account2.type &&
        account1.index === account2.index
      );
    };

    const accounts = await this.walletAccountRepository.getAccounts();
    const deletedIndex = accounts.findIndex((current) => equalsAccount(current, account));
    let currentIndex = 0;
    if (deletedIndex > 0) {
      currentIndex = deletedIndex - 1;
    }

    if (currentIndex > -1) {
      await this.changeCurrentAccount(accounts[currentIndex]);
    }

    const filteredAccounts = accounts.filter((current) => !equalsAccount(current, account));
    await this.walletAccountRepository.updateAccounts(filteredAccounts);
    return true;
  };

  /**
   * This function updates account via gno api.
   *
   * @param gnoClient GnoClient instance
   * @param account Account instance
   * @returns updated Account instance
   */
  public updateAccountInfo = async (account: Account) => {
    await this.updateCurrentAccount(account);
    return account;
  };

  /**
   * This function loads the names of the stored accounts.
   *
   * @returns account's names
   */
  public getAccountNames = async () => {
    const accountNames = await this.walletAccountRepository.getAccountNames();
    return accountNames;
  };

  /**
   * This function updates the account name by address and name.
   *
   * @param address
   * @param name
   */
  public updateAccountName = async (account: Account, name: string) => {
    account.name = name;
    await this.updateCurrentAccount(account);
    return true;
  };

  public getLastAccountIndex = async () => {
    try {
      const accounts = await this.getAccounts();
      const indices = accounts
        .filter((account) => Boolean(account.index))
        .map((account) => account.index);

      if (indices.length < 1) {
        return 0;
      }
      return Math.max(...indices);
    } catch (e) {
      return 0;
    }
  };

  public getAddedAccountNumber = async () => {
    try {
      const accounts = await this.getAccounts();
      const aminoAccounts = accounts.filter((account) => isLedgerAccount(account) === false);
      return aminoAccounts.length + 1;
    } catch (e) {
      return 1;
    }
  };

  public getAddedAccountPath = async () => {
    const accounts = await this.getAccounts();
    const accountPaths = accounts.map((account) => account.toData().hdPath ?? 0);
    const maxPath = Math.max(...accountPaths);

    for (let path = 0; path < maxPath; path++) {
      if (!accountPaths.includes(path)) {
        return path;
      }
    }
    return maxPath + 1;
  };

  public updateLastAccountPath = async (accountPath: number) => {
    this.walletAccountRepository.updateAccountPath(accountPath);
    return true;
  };

  public clear = async () => {
    await this.walletAccountRepository.deleteCurrentAccountAddress();
    await this.walletAccountRepository.deleteAccountNames();
    await this.walletAccountRepository.deleteAccountPath();
    await this.walletAccountRepository.deleteAccounts();
    return true;
  };
}

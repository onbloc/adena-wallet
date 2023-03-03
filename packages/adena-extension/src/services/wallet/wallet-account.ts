import { WalletAccount } from 'adena-module';
import { GnoClient } from 'gno-client';
import { WalletAccountRepository } from '@repositories/wallet';
import { WalletError } from '@common/errors';

export class WalletAccountService {

  private gnoClient: InstanceType<typeof GnoClient> | null;

  private walletAccountRepository: WalletAccountRepository;

  constructor(gnoClient: InstanceType<typeof GnoClient> | null, walletAccountRepository: WalletAccountRepository) {
    this.gnoClient = gnoClient;
    this.walletAccountRepository = walletAccountRepository;
  }

  public setGnoClient(gnoClient: InstanceType<typeof GnoClient>) {
    this.gnoClient = gnoClient;
  }

  public getCurrentAccount = async () => {
    const accounts = await this.getAccounts();
    if (accounts.length === 0) {
      throw new WalletError("NOT_FOUND_ACCOUNT");
    }
    const currentAccountAddress = await this.walletAccountRepository.getCurrentAccountAddress();
    const currentAccount = accounts.find(account => account.getAddress() === currentAccountAddress) ?? accounts[0];
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
      return currentAccount.getAddress();
    } catch (e) {
      return "";
    }
  };

  public updateCurrentAccount = async (
    currentAccount: InstanceType<typeof WalletAccount>,
  ) => {
    const accounts = await this.getAccounts();
    const changedAccounts = accounts.map(account => {
      if (
        account.data.address === currentAccount.data.address &&
        account.data.index === currentAccount.data.index &&
        account.data.accountType === currentAccount.data.accountType
      ) {
        return currentAccount;
      }
      return account;
    });
    await this.walletAccountRepository.updateCurrentAccountIndex(currentAccount.data.index);
    await this.walletAccountRepository.updateCurrentAccountAddress(currentAccount.getAddress());
    await this.updateAccounts(changedAccounts);
    return true;
  };

  public changeCurrentAccount = async (account: InstanceType<typeof WalletAccount>) => {
    await this.walletAccountRepository.updateCurrentAccountIndex(account.data.index);
    await this.walletAccountRepository.updateCurrentAccountAddress(account.getAddress());
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
   * @returns WalletAccount instances
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
  public updateAccounts = async (accounts: Array<InstanceType<typeof WalletAccount>>) => {
    await this.walletAccountRepository.updateAccounts(accounts);
    return true;
  };

  /**
   * 
   * @param account s
   * @returns 
   */
  public addAccount = async (account: InstanceType<typeof WalletAccount>) => {
    const accounts = await this.walletAccountRepository.getAccounts();
    await this.walletAccountRepository.updateAccounts([...accounts, account]);
    await this.walletAccountRepository.updateCurrentAccountIndex(account.data.index);
    return true;
  };

  public deleteAccount = async (account: InstanceType<typeof WalletAccount>) => {
    const equalsAccount = (account1: InstanceType<typeof WalletAccount>, account2: InstanceType<typeof WalletAccount>) => {
      return (account1.data.address === account2.data.address) &&
        (account1.data.accountType === account2.data.accountType) &&
        (account1.data.index === account2.data.index);
    };

    const accounts = await this.walletAccountRepository.getAccounts();
    const deletedIndex = accounts.findIndex(current => equalsAccount(current, account));
    let currentIndex = 0;
    if (deletedIndex > 0) {
      currentIndex = deletedIndex - 1;
    }

    if (currentIndex > -1) {
      await this.changeCurrentAccount(accounts[currentIndex]);
    }

    const filteredAccounts = accounts.filter(current => !equalsAccount(current, account));
    await this.walletAccountRepository.updateAccounts(filteredAccounts);
    return true;
  };

  /**
   * This function updates account via gno api.
   *
   * @param gnoClient GnoClient instance
   * @param account WalletAccount instance
   * @returns updated WalletAccount instance
   */
  public updateAccountInfo = async (
    account: InstanceType<typeof WalletAccount>,
  ) => {
    if (!this.gnoClient) {
      return account;
    }
    const currentAccount = account.clone();
    const { accountNumber, coins, sequence, status } = await this.gnoClient.getAccount(
      currentAccount.getAddress(),
    );

    currentAccount.updateByGno({ accountNumber, coins, sequence, status });
    await this.updateCurrentAccount(currentAccount);
    return currentAccount;
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
  public updateAccountName = async (account: InstanceType<typeof WalletAccount>, name: string) => {
    const clone = account.clone();
    clone.setName(name);
    await this.updateCurrentAccount(clone);
    return true;
  };

  public getLastAccountIndex = async () => {
    try {
      const accounts = await this.getAccounts();
      const indices = accounts
        .filter(account => Boolean(account.data.index))
        .map(account => account.data.index);

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
      const aminoAccounts = accounts
        .filter(account => account.data.signerType === 'AMINO')
      return aminoAccounts.length + 1;
    } catch (e) {
      return 1;
    }
  };

  public getAddedAccountPath = async () => {
    const accounts = await this.getAccounts();
    const accountPaths = accounts.map(account => account.data.path);
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

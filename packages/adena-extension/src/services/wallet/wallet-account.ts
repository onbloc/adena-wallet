import { WalletAccount } from 'adena-module';
import { GnoClient } from 'gno-client';
import { WalletAccountRepository } from '@repositories/wallet';

export class WalletAccountService {

  private gnoClient: InstanceType<typeof GnoClient> | null;

  private walletAccountRepository: WalletAccountRepository;

  constructor(gnoClient: InstanceType<typeof GnoClient> | null, walletAccountRepository: WalletAccountRepository) {
    this.gnoClient = gnoClient;
    this.walletAccountRepository = walletAccountRepository;
  }

  public saveCurrentAccountAddress = async (address: string) => {
    await this.walletAccountRepository.updateCurrentAccountAddress(address);
  };

  public loadCurrentAccountAddress = async () => {
    const currentAccountAddress = await this.walletAccountRepository.getCurrentAccountAddress();
    return currentAccountAddress;
  };

  /**
   * This function saves accounts in the wallet.
   *
   * @param walletAccounts Wallet instnace arrays
   */
  public saveAccounts = async (walletAccounts: Array<InstanceType<typeof WalletAccount>>) => {
    await this.walletAccountRepository.updateAccounts(walletAccounts);
  };

  /**
   * This function loads accounts in the wallet.
   *
   * @param wallet Wallet instnace
   * @returns WalletAccount instances
   */
  public loadAccounts = async () => {
    const accounts = await this.walletAccountRepository.getAccounts();
    return accounts;
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
      return null;
    }
    const currentAccount = account.clone();
    const { accountNumber, coins, sequence, status } = await this.gnoClient.getAccount(
      currentAccount.getAddress(),
    );

    currentAccount.updateByGno({ accountNumber, coins, sequence, status });
    return currentAccount;
  };

  /**
   * This function loads the names of the stored accounts.
   *
   * @returns account's names
   */
  public loadAccountNames = async () => {
    const accountNames = await this.walletAccountRepository.getAccountNames();
    return accountNames;
  };

  /**
   * This function updates the account name by address and name.
   *
   * @param address
   * @param name
   */
  public updateAccountName = async (address: string, name: string) => {
    const accountNames = await this.loadAccountNames();
    const changedAccountNames: { [key in string]: string } = {
      ...accountNames,
      [address]: name,
    };
    await this.walletAccountRepository.updateAccountNames(changedAccountNames);
  };

  /**
   * This function changes account names by accounts.
   *
   * @param accounts WalletAccount instances
   * @returns changed WalletAccount instances
   */
  public changeAccountsByAccountNames = async (
    accounts: Array<InstanceType<typeof WalletAccount>>,
  ) => {
    const accountNames = await this.loadAccountNames();
    const changedAccounts = [...accounts].map((account) => this.getChangedAccount(account, accountNames));
    return changedAccounts;
  };

  /**
   * This function increments the number of accounts in the wallet by 1.
   */
  public increaseWalletAccountPaths = async () => {
    let accountPaths = await this.walletAccountRepository.getAccountPaths();
    if (accountPaths.length < 1) {
      accountPaths = [0];
    }
    const maxPathValue = Math.max(...accountPaths);
    const increasedAccountPaths = [...accountPaths, maxPathValue + 1];
    await this.walletAccountRepository.updateAccountPaths(increasedAccountPaths);
  };

  /**
   * This function decrements the number of accounts in the wallet by 1.
   */
  public decreaseWalletAccountPaths = async () => {
    let accountPaths = await this.walletAccountRepository.getAccountPaths();
    if (accountPaths.length < 1) {
      accountPaths = [0];
    }
    const decreasedAccountPaths = [...accountPaths].slice(0, -1);
    await this.walletAccountRepository.updateAccountPaths(decreasedAccountPaths);
  };

  public clearWalletAccountData = async () => {
    await this.walletAccountRepository.deleteAccounts();
  };

  private getChangedAccount = (
    account: InstanceType<typeof WalletAccount>,
    accountNames: { [key in string]: string },
  ): InstanceType<typeof WalletAccount> => {
    if (Object.keys(accountNames).includes(account.getAddress())) {
      const name = accountNames[account.getAddress()];
      return new WalletAccount({ ...account.data, name });
    }
    return account;
  };

}

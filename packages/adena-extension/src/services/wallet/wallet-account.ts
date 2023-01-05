import { WalletAccount, WalletAccountConfig } from 'adena-module';
import { GnoClient } from 'gno-client';
import { WalletAccountRepository } from '@repositories/wallet';

export const saveCurrentAccountAddress = async (address: string) => {
  await WalletAccountRepository.updateCurrentAccountAddress(address);
};

export const loadCurrentAccountAddress = async () => {
  const currentAccountAddress = await WalletAccountRepository.getCurrentAccountAddress();
  return currentAccountAddress;
};

/**
 * This function saves accounts in the wallet.
 *
 * @param walletAccounts Wallet instnace arrays
 */
export const saveAccounts = async (walletAccounts: Array<InstanceType<typeof WalletAccount>>) => {
  await WalletAccountRepository.updateAccounts(walletAccounts);
};

/**
 * This function loads accounts in the wallet.
 *
 * @param wallet Wallet instnace
 * @returns WalletAccount instances
 */
export const loadAccounts = async (config?: {
  chainId: string;
  coinDenom: string;
  coinMinimalDenom: string;
  coinDecimals: number;
}) => {
  const accounts = await WalletAccountRepository.getAccounts(config);
  return accounts;
};

/**
 * This function updates account via gno api.
 *
 * @param gnoClient GnoClient instance
 * @param account WalletAccount instance
 * @returns updated WalletAccount instance
 */
export const updateAccountInfo = async (
  gnoClient: InstanceType<typeof GnoClient>,
  account: InstanceType<typeof WalletAccount>,
) => {
  const currentAccount = account.clone();
  const { accountNumber, coins, sequence, status } = await gnoClient.getAccount(
    currentAccount.getAddress(),
  );

  currentAccount.setConfig(new WalletAccountConfig(gnoClient.config));
  currentAccount.updateByGno({ accountNumber, coins, sequence, status });
  return currentAccount;
};

/**
 * This function loads the names of the stored accounts.
 *
 * @returns account's names
 */
export const loadAccountNames = async () => {
  const accountNames = await WalletAccountRepository.getAccountNames();
  return accountNames;
};

/**
 * This function updates the account name by address and name.
 *
 * @param address
 * @param name
 */
export const updateAccountName = async (address: string, name: string) => {
  const accountNames = await loadAccountNames();
  const changedAccountNames: { [key in string]: string } = {
    ...accountNames,
    [address]: name,
  };
  await WalletAccountRepository.updateAccountNames(changedAccountNames);
};

/**
 * This function changes account names by accounts.
 *
 * @param accounts WalletAccount instances
 * @returns changed WalletAccount instances
 */
export const changeAccountsByAccountNames = async (
  accounts: Array<InstanceType<typeof WalletAccount>>,
) => {
  const accountNames = await loadAccountNames();
  const changedAccounts = [...accounts].map((account) => getChangedAccount(account, accountNames));
  return changedAccounts;
};

/**
 * This function increments the number of accounts in the wallet by 1.
 */
export const increaseWalletAccountPaths = async () => {
  let accountPaths = await WalletAccountRepository.getAccountPaths();
  if (accountPaths.length < 1) {
    accountPaths = [0];
  }
  const maxPathValue = Math.max(...accountPaths);
  const increasedAccountPaths = [...accountPaths, maxPathValue + 1];
  await WalletAccountRepository.updateAccountPaths(increasedAccountPaths);
};

/**
 * This function decrements the number of accounts in the wallet by 1.
 */
export const decreaseWalletAccountPaths = async () => {
  let accountPaths = await WalletAccountRepository.getAccountPaths();
  if (accountPaths.length < 1) {
    accountPaths = [0];
  }
  const decreasedAccountPaths = [...accountPaths].slice(0, -1);
  await WalletAccountRepository.updateAccountPaths(decreasedAccountPaths);
};

export const clearWalletAccountData = async () => {
  await WalletAccountRepository.deleteAccounts();
};

const getChangedAccount = (
  account: InstanceType<typeof WalletAccount>,
  accountNames: { [key in string]: string },
): InstanceType<typeof WalletAccount> => {
  if (Object.keys(accountNames).includes(account.getAddress())) {
    const name = accountNames[account.getAddress()];
    return new WalletAccount({ ...account.data, name });
  }
  return account;
};

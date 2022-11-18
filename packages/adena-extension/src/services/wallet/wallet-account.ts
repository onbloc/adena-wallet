import { LocalStorageValue } from '@common/values';
import { Wallet, WalletAccount, WalletAccountConfig } from 'adena-wallet';
import { GnoClient } from 'gno-client';

/**
 * This function loads accounts by wallet.
 *
 * @param wallet Wallet instnace
 * @returns WalletAccount instances
 */
export const loadAccounts = async (
  wallet: InstanceType<typeof Wallet>,
  config?: {
    chainId: string;
    coinDenom: string;
    coinMinimalDenom: string;
    coinDecimals: number;
  },
) => {
  const currentWallet = wallet.clone();
  const accountNames = await loadAccountNames();
  await currentWallet.initAccounts(accountNames, config);
  return currentWallet.getAccounts();
};

/**
 * This function updates account by gno api.
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
 * This function loads stored account's names.
 *
 * @returns account's names
 */
export const loadAccountNames = async () => {
  const accountNames = await LocalStorageValue.getToObject('WALLET_ACCOUNT_NAMES');
  return accountNames;
};

/**
 * This function updates account name by address and name.
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
  await LocalStorageValue.setByObject('WALLET_ACCOUNT_NAMES', changedAccountNames);
};

/**
 * This function changes accounts by account names.
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
 * This function increments the number of accounts in the wallet.
 */
export const increaseWalletAccountPaths = async () => {
  let accountPaths = await LocalStorageValue.getToNumbers('WALLET_ACCOUNT_PATHS');
  if (accountPaths.length < 1) {
    accountPaths = [0];
  }
  const maxPathValue = Math.max(...accountPaths);
  const increasedAccountPaths = [...accountPaths, maxPathValue + 1];
  await LocalStorageValue.setByNumbers('WALLET_ACCOUNT_PATHS', increasedAccountPaths);
};

/**
 * This function decrements the number of accounts in the wallet.
 */
export const decreaseWalletAccountPaths = async () => {
  let accountPaths = await LocalStorageValue.getToNumbers('WALLET_ACCOUNT_PATHS');
  if (accountPaths.length < 1) {
    accountPaths = [0];
  }
  const decreasedAccountPaths = [...accountPaths].slice(0, -1);
  await LocalStorageValue.setByNumbers('WALLET_ACCOUNT_PATHS', decreasedAccountPaths);
};

export const clearWalletAccountData = async () => {
  await LocalStorageValue.remove('CURRENT_ACCOUNT_ADDRESS');
  await LocalStorageValue.remove('WALLET_ACCOUNT_NAMES');
  await LocalStorageValue.remove('WALLET_ACCOUNT_PATHS');
  await LocalStorageValue.remove('ESTABLISH_SITES');
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

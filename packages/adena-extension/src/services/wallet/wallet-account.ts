import { LocalStorageValue } from '@common/values';
import { WalletAccount, WalletAccountConfig } from 'adena-module';
import { GnoClient } from 'gno-client';

/**
 * This function saves accounts in the wallet.
 *
 * @param walletAccounts Wallet instnace arrays
 */
export const saveAccounts = async (walletAccounts: Array<InstanceType<typeof WalletAccount>>) => {
  const serializedAccounts = walletAccounts.map(account => account.serialize());
  await LocalStorageValue.setByObject('WALLET_ACCOUNTS', serializedAccounts);
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
  const serializedAccounts = await LocalStorageValue.getToObject<Array<string>>('WALLET_ACCOUNTS');
  if (!Array.isArray(serializedAccounts)) {
    return [];
  }
  const accounts: Array<InstanceType<typeof WalletAccount>> = [];
  serializedAccounts.forEach((serializedAccount) => {
    try {
      const account = WalletAccount.deserialize(serializedAccount);
      if (config) {
        account.setConfig(new WalletAccountConfig(config));
      }
      if (!accounts.find(item => item.getAddress() === account.getAddress())) {
        accounts.push(account);
      }
    } catch (e) {
      console.error(e);
    }
  });
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
  const accountNames = await LocalStorageValue.getToObject('WALLET_ACCOUNT_NAMES');
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
  await LocalStorageValue.setByObject('WALLET_ACCOUNT_NAMES', changedAccountNames);
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
  let accountPaths = await LocalStorageValue.getToNumbers('WALLET_ACCOUNT_PATHS');
  if (accountPaths.length < 1) {
    accountPaths = [0];
  }
  const maxPathValue = Math.max(...accountPaths);
  const increasedAccountPaths = [...accountPaths, maxPathValue + 1];
  await LocalStorageValue.setByNumbers('WALLET_ACCOUNT_PATHS', increasedAccountPaths);
};

/**
 * This function decrements the number of accounts in the wallet by 1.
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
  await LocalStorageValue.remove('WALLET_ACCOUNTS');
  await LocalStorageValue.remove('WALLET_ACCOUNT_NAMES');
  await LocalStorageValue.remove('WALLET_ACCOUNT_PATHS');
  await LocalStorageValue.remove('ADDRESS_BOOK');
  await LocalStorageValue.remove('CURRENT_CHAIN_ID');
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

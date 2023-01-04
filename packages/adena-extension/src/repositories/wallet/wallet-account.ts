import { AdenaStorage } from "@common/storage";
import { WalletAccount, WalletAccountConfig } from "adena-module";

type LocalValueType =
  | 'WALLET_ACCOUNT_PATHS'
  | 'WALLET_ACCOUNT_NAMES'
  | 'CURRENT_ACCOUNT_ADDRESS'
  | 'ADDRESS_BOOK'
  | 'WALLET_ACCOUNTS'
  | 'CURRENT_CHAIN_ID'
  | 'ESTABLISH_SITES';

export const getCurrentAccountAddress = async (
) => {
  const localStorage = AdenaStorage.local<LocalValueType>();
  const currentAccountAddress = await localStorage.get('CURRENT_ACCOUNT_ADDRESS');
  return currentAccountAddress;
};

export const updateCurrentAccountAddress = async (address: string) => {
  const localStorage = AdenaStorage.local<LocalValueType>();
  await localStorage.set('CURRENT_ACCOUNT_ADDRESS', address);
  return true;
};

export const getAccounts = async (config?: {
  chainId: string;
  coinDenom: string;
  coinMinimalDenom: string;
  coinDecimals: number;
}) => {
  const localStorage = AdenaStorage.local<LocalValueType>();
  const serializedAccounts = await localStorage.getToObject('WALLET_ACCOUNTS');
  if (!Array.isArray(serializedAccounts)) {
    return [];
  }

  const accounts = serializedAccounts.map(serializedAccount => {
    try {
      const account = WalletAccount.deserialize(serializedAccount);
      config && account.setConfig(new WalletAccountConfig(config));
      return account;
    } catch (e) {
      return null;
    }
  }).filter(account => account !== null);
  return accounts as Array<InstanceType<typeof WalletAccount>>;
};

export const updateAccounts = async (walletAccounts: Array<InstanceType<typeof WalletAccount>>) => {
  const serializedAccounts = walletAccounts.map(account => account.serialize());
  const localStorage = AdenaStorage.local<LocalValueType>();
  await localStorage.setByObject('WALLET_ACCOUNTS', serializedAccounts);
};

export const getAccountPaths = async () => {
  const localStorage = AdenaStorage.local<LocalValueType>();
  const accountPaths = await localStorage.getToNumbers('WALLET_ACCOUNT_PATHS');
  if (accountPaths.length === 0) {
    return [0];
  }
  return accountPaths;
};

export const updateAccountPaths = async (accountPaths: Array<number>) => {
  const localStorage = AdenaStorage.local<LocalValueType>();
  await localStorage.setByNumbers('WALLET_ACCOUNT_PATHS', accountPaths);
  return true;
};

export const getAccountNames = async () => {
  const localStorage = AdenaStorage.local<LocalValueType>();
  const accountNames = await localStorage.getToObject('WALLET_ACCOUNT_NAMES');
  return accountNames;
};

export const updateAccountNames = async (accountNames: { [key in string]: string }) => {
  const localStorage = AdenaStorage.local<LocalValueType>();
  await localStorage.setByObject('WALLET_ACCOUNT_NAMES', accountNames);
  return true;
};

export const deleteAccounts = async () => {
  const localStorage = AdenaStorage.local<LocalValueType>();
  await localStorage.remove('CURRENT_ACCOUNT_ADDRESS');
  await localStorage.remove('WALLET_ACCOUNTS');
  await localStorage.remove('WALLET_ACCOUNT_NAMES');
  await localStorage.remove('WALLET_ACCOUNT_PATHS');
  await localStorage.remove('CURRENT_CHAIN_ID');
  await localStorage.remove('ESTABLISH_SITES');
}
import { WalletError } from '@common/errors/wallet/wallet-error';
import { Wallet } from 'adena-module';
import { WalletAccountRepository, WalletRepository } from '@repositories/wallet';

/**
 * This function creates a wallet instance.
 *
 * @param parmas Parameters
 * - mnemonic: mnemonic seeds
 * - password: wallet's password
 * @returns Wallet
 */
export const createWallet = async ({ mnemonic, password }: { mnemonic: string; password: string }) => {
  const wallet = await createWalletByMnemonic(mnemonic);
  saveWallet(wallet, password);
  return wallet;
};

/**
 * This function loads a wallet instance.
 *
 * @returns Wallet
 */
export const loadWallet = async () => {
  const password = await WalletRepository.getWalletPassword();
  const walletInstance = await deserializeWallet(password);
  return walletInstance;
};

/**
 * This function loads a wallet instance with the password.
 *
 * @param password wallet's password
 * @returns Wallet
 */
export const loadWalletWithPassword = async (password: string) => {
  const walletInstance = await deserializeWallet(password);
  await WalletRepository.updateWalletPassword(password);
  return walletInstance;
};

/**
 * This function checks if the wallet is locked.
 *
 * @returns boolean
 */
export const isLocked = async () => {
  try {
    const password = await WalletRepository.getWalletPassword();
    return password === '';
  } catch (e) {
    return true;
  }
};

export const loadWalletPassword = async () => {
  return await WalletRepository.getWalletPassword();
};

/**
 * This function creates a wallet with mnemonic seeds.
 *
 * @params Parameters
 * - mnemonic mnemonic seeds
 * - accountPaths (Optional) account path's numbers
 * @throws WalletError 'FAILED_TO_CREATE'
 * @returns Wallet
 */
const createWalletByMnemonic = async (mnemonic: string, accountPaths?: Array<number>) => {
  try {
    if (accountPaths) {
      await WalletAccountRepository.updateAccountPaths(accountPaths);
    }
    const currentAccountPath = await WalletAccountRepository.getAccountPaths();
    const wallet = await Wallet.createByMnemonic(mnemonic, currentAccountPath ?? [0]);
    return wallet;
  } catch (e) {
    throw new WalletError('FAILED_TO_CREATE');
  }
};

/**
 * This function serializes the wallet with a password.
 *
 * @param wallet Wallet instance
 * @param password wallet's password
 */
const saveWallet = async (
  wallet: InstanceType<typeof Wallet>,
  password: string,
) => {
  const serializedWallet = await wallet.serialize(password);
  await WalletRepository.updateSerializedWallet(serializedWallet);
  await WalletRepository.updateWalletPassword(password);
};

/**
 * This function deserializes the wallet with the password.
 *
 * @throws WalletError 'FAILED_TO_LOAD'
 * @returns Wallet
 */
const deserializeWallet = async (password: string) => {
  try {
    const serializedWallet = await WalletRepository.getSerializedWallet();
    const walletInstance = await Wallet.createBySerialized(serializedWallet, password);
    return walletInstance;
  } catch (e) {
    throw new WalletError('FAILED_TO_LOAD');
  }
};

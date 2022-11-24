import { WalletError } from '@common/errors/wallet/wallet-error';
import { decryptPassword, encryptPassword } from '@common/utils/crypto-utils';
import { LocalStorageValue, SessionStorageValue } from '@common/values';
import { Wallet } from 'adena-wallet';

/**
 * This function creates a wallet instance.
 *
 * @param parmas Parameters
 * - mnemonic: mnemonic seeds
 * - password: wallet's password
 * @returns Wallet
 */
export const createWallet = async (parmas: { mnemonic: string; password: string }) => {
  const { mnemonic, password } = parmas;
  const wallet = await createWalletByMnemonic(mnemonic);
  await saveSerializedWallet(wallet, password);
  return wallet;
};

/**
 * This function loads a wallet instance.
 *
 * @returns Wallet
 */
export const loadWallet = async () => {
  const serializedWallet = await loadSerializedWallet();
  const password = await loadWalletPassword();
  const walletInstance = await deserializeWallet(serializedWallet, password);
  return walletInstance;
};

/**
 * This function loads a wallet instance with the password.
 *
 * @param password wallet's password
 * @returns Wallet
 */
export const loadWalletWithPassword = async (password: string) => {
  const serializedWallet = await loadSerializedWallet();
  const walletInstance = await deserializeWallet(serializedWallet, password);
  await saveWalletPassword(password);
  return walletInstance;
};

/**
 * This function encrypts and saves the wallet password.
 *
 * @param password wallet's password
 */
export const saveWalletPassword = async (password: string) => {
  const { encryptedKey, encryptedPassword } = encryptPassword(password);
  await SessionStorageValue.set('ENCRYPTED_KEY', encryptedKey);
  await SessionStorageValue.set('ENCRYPTED_PASSWORD', encryptedPassword);
};

/**
 * This function loads the wallet by decrypting the password.
 *
 * @throws WalletError 'NOT_FOUND_PASSWORD'
 * @returns decrypted password
 */
export const loadWalletPassword = async () => {
  const encryptedKey = (await SessionStorageValue.get('ENCRYPTED_KEY')) || '';
  const encryptedPassword = (await SessionStorageValue.get('ENCRYPTED_PASSWORD')) || '';
  if (encryptedKey === '' || encryptedPassword === '') {
    throw new WalletError('NOT_FOUND_PASSWORD');
  }
  try {
    const password = decryptPassword(encryptedKey, encryptedPassword);
    return password;
  } catch (e) {
    throw new WalletError('NOT_FOUND_PASSWORD');
  }
};

/**
 * This function serializes the wallet with a password.
 *
 * @param wallet Wallet instance
 * @param passowrd wallet's password
 */
export const saveSerializedWallet = async (
  wallet: InstanceType<typeof Wallet>,
  passowrd: string,
) => {
  const serializedWallet = await wallet.serialize(passowrd);
  await LocalStorageValue.set('SERIALIZED', serializedWallet);
  await saveWalletPassword(passowrd);
};

/**
 * This function checks if the wallet is locked.
 *
 * @returns boolean
 */
export const isLocked = async () => {
  try {
    const password = await loadWalletPassword();
    return password === '';
  } catch (e) {
    return true;
  }
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
    let currentAccountPath = accountPaths ?? [0];
    if (!accountPaths) {
      const storedAccountPaths = await LocalStorageValue.getToNumbers('WALLET_ACCOUNT_PATHS');
      if (storedAccountPaths.length > 0) {
        currentAccountPath = storedAccountPaths;
      }
    }
    await LocalStorageValue.setByNumbers('WALLET_ACCOUNT_PATHS', currentAccountPath);
    const wallet = await Wallet.createByMnemonic(mnemonic, currentAccountPath);
    return wallet;
  } catch (e) {
    throw new WalletError('FAILED_TO_CREATE');
  }
};

/**
 * This function loads the serialized wallet.
 *
 * @throws WalletError 'NOT_FOUND_SERIALIZED'
 * @returns Wallet
 */
const loadSerializedWallet = async () => {
  const serializedWallet = await LocalStorageValue.get('SERIALIZED');

  if (!serializedWallet || serializedWallet.length === 0) {
    throw new WalletError('NOT_FOUND_SERIALIZED');
  }
  return serializedWallet;
};

/**
 * This function deserializes the wallet with the password.
 *
 * @throws WalletError 'FAILED_TO_LOAD'
 * @returns Wallet
 */
const deserializeWallet = async (serializedWallet: string, password: string) => {
  try {
    const walletInstance = await Wallet.createBySerialized(serializedWallet, password);
    return walletInstance;
  } catch (e) {
    throw new WalletError('FAILED_TO_LOAD');
  }
};

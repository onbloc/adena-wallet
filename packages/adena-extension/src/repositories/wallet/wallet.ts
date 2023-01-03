import { WalletError } from "@common/errors";
import { AdenaStorage } from "@common/storage";
import { encryptPassword, decryptPassword } from "@common/utils/crypto-utils";

type LocalValueType =
  | 'SERIALIZED'
  | 'CURRENT_CHAIN_ID'
type SessionValueType =
  | 'ENCRYPTED_KEY'
  | 'ENCRYPTED_PASSWORD';

export const getSerializedWallet = async () => {
  const localStorage = AdenaStorage.local<LocalValueType>();
  const serializedWallet = await localStorage.get('SERIALIZED');
  if (!serializedWallet || serializedWallet === '') {
    throw new WalletError('NOT_FOUND_SERIALIZED');
  }
  return serializedWallet;
};

export const updateSerializedWallet = async (serializedWallet: string) => {
  const localStorage = AdenaStorage.local<LocalValueType>();
  await localStorage.set('SERIALIZED', serializedWallet);
  return true;
};

export const getWalletPassword = async () => {
  const sessionStorage = AdenaStorage.session<SessionValueType>();
  const encryptedKey = await sessionStorage.get('ENCRYPTED_KEY');
  const encryptedPassword = await sessionStorage.get('ENCRYPTED_PASSWORD');

  if (encryptedKey === '' || encryptedPassword === '') {
    throw new WalletError('NOT_FOUND_PASSWORD');
  }

  try {
    return decryptPassword(encryptedKey, encryptedPassword);
  } catch (e) {
    throw new WalletError('NOT_FOUND_PASSWORD');
  }
};

export const updateWalletPassword = async (password: string) => {
  const sessionStorage = AdenaStorage.session<SessionValueType>();
  const { encryptedKey, encryptedPassword } = encryptPassword(password);
  await sessionStorage.set('ENCRYPTED_KEY', encryptedKey);
  await sessionStorage.set('ENCRYPTED_PASSWORD', encryptedPassword);
  return true;
};

export const getCurrentChainId = async () => {
  const localStorage = AdenaStorage.local<LocalValueType>();
  return await localStorage.get('CURRENT_CHAIN_ID');
};

export const updateCurrentChainId = async (chainId: string) => {
  const localStorage = AdenaStorage.local<LocalValueType>();
  await localStorage.set('CURRENT_CHAIN_ID', chainId);
  return true;
};

export const removePassword = async () => {
  const sessionStorage = AdenaStorage.session<SessionValueType>();
  await sessionStorage.remove('ENCRYPTED_KEY');
  await sessionStorage.remove('ENCRYPTED_PASSWORD');
  return true;
};

export const existsWalletPassword = async () => {
  const sessionStorage = AdenaStorage.session<SessionValueType>();
  const encryptedKey = await sessionStorage.get('ENCRYPTED_KEY');
  const encryptedPassword = await sessionStorage.get('ENCRYPTED_PASSWORD');

  return encryptedKey && encryptedPassword;
};
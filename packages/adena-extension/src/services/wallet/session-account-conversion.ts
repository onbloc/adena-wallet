import {
  Account,
  AdenaWallet,
  isPrivateKeyKeyring,
  isSessionAccount,
  isSessionKeyring,
  PrivateKeyKeyring,
  SingleAccount,
  Wallet,
} from 'adena-module';

import { GNO_ADDRESS_PREFIX as DEFAULT_GNO_PREFIX } from '@common/constants/chain.constant';

export interface SessionAccountConversionResult {
  wallet: AdenaWallet;
  convertedAccounts: Account[];
  convertedSessionAddrs: string[];
  nextCurrentAccount: Account | null;
}

const bytesEqual = (a: Uint8Array, b: Uint8Array): boolean => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

const convertName = (name: string, wallet: AdenaWallet): string => {
  if (/^Session(\s+\d+)?$/.test(name)) {
    return wallet.nextAccountName;
  }
  return name;
};

export async function convertSessionAccountsToPrivateKey(
  wallet: Wallet,
  sessionAddrs: string[],
  addressPrefix = DEFAULT_GNO_PREFIX,
): Promise<SessionAccountConversionResult> {
  const targetAddrs = new Set(sessionAddrs);
  const cloned = wallet.clone();
  const convertedAccounts: Account[] = [];
  const convertedSessionAddrs: string[] = [];
  let nextCurrentAccount: Account | null = null;

  let currentAccountId: string | undefined;
  try {
    currentAccountId = wallet.currentAccount.id;
  } catch {
    currentAccountId = undefined;
  }

  const sessionAccounts = [...cloned.accounts].filter(isSessionAccount);
  for (const account of sessionAccounts) {
    const sessionAddr = await account.getAddress(addressPrefix).catch(() => null);
    if (!sessionAddr || !targetAddrs.has(sessionAddr)) {
      continue;
    }

    const sessionKeyring = cloned.keyrings.find((keyring) => keyring.id === account.keyringId);
    if (!sessionKeyring || !isSessionKeyring(sessionKeyring)) {
      continue;
    }

    const wasCurrentAccount = account.id === currentAccountId;
    cloned.removeAccount(account);

    const existingKeyring = cloned.keyrings.find(
      (keyring) =>
        isPrivateKeyKeyring(keyring) &&
        bytesEqual(keyring.privateKey, sessionKeyring.privateKey),
    );
    const existingAccount = existingKeyring
      ? cloned.accounts.find((candidate) => candidate.keyringId === existingKeyring.id)
      : undefined;

    let convertedAccount: Account;
    if (existingAccount) {
      convertedAccount = existingAccount;
    } else {
      const privateKeyKeyring = new PrivateKeyKeyring({
        publicKey: Array.from(sessionKeyring.publicKey),
        privateKey: Array.from(sessionKeyring.privateKey),
      });
      const name = convertName(account.name, cloned);
      const nextIndex = cloned.lastAccountIndex + 1;
      convertedAccount = await SingleAccount.createBy(privateKeyKeyring, name);
      convertedAccount.index = nextIndex;
      cloned.addKeyring(privateKeyKeyring);
      cloned.addAccount(convertedAccount);
    }

    if (wasCurrentAccount) {
      cloned.currentAccountId = convertedAccount.id;
      nextCurrentAccount = convertedAccount;
    }
    convertedAccounts.push(convertedAccount);
    convertedSessionAddrs.push(sessionAddr);
  }

  return {
    wallet: cloned,
    convertedAccounts,
    convertedSessionAddrs,
    nextCurrentAccount,
  };
}

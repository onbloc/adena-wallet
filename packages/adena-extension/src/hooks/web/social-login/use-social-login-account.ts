import { GnoSocialWalletProvider } from '@adena-wallet/sdk';
import {
  AdenaWallet,
  arrayToHex,
  SingleAccount,
  Web3AuthKeyring,
  Web3AuthKeyringType,
} from 'adena-module';
import { useCallback } from 'react';

import { requestSocialPrivateKey } from '@common/utils/social-login';
import useAppNavigate from '@hooks/use-app-navigate';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { pendingWalletStore } from '@services/wallet/pending-wallet-store';
import { RoutePath } from '@types';

/** Tells whether the login attempt that started this work still owns the flow. */
export type IsCurrentRequest = () => boolean;

/** Why a social login ended on the failure step. */
export type SocialLoginFailType = 'DEFAULT' | 'DUPLICATE_ACCOUNT';

export class DuplicateSocialAccountError extends Error {
  constructor() {
    super('This account has already been added to the wallet.');
    this.name = 'DuplicateSocialAccountError';
  }
}

export function toSocialLoginFailType(error: unknown): SocialLoginFailType {
  return error instanceof DuplicateSocialAccountError ? 'DUPLICATE_ACCOUNT' : 'DEFAULT';
}

export type UseSocialLoginAccountReturn = {
  connectWithProvider: (
    provider: GnoSocialWalletProvider,
    keyringType: Web3AuthKeyringType,
    isCurrentRequest: IsCurrentRequest,
  ) => Promise<void>;
};

// Turns the key a social provider derived into an Adena account. What happens
// after the key arrives is the same for every provider.
//
// Every await here can outlive the screen that started it, so the attempt is
// re-checked after each one: an abandoned login must not write to the wallet,
// stage a pending wallet or navigate.
const useSocialLoginAccount = (): UseSocialLoginAccountReturn => {
  const { walletService } = useAdenaContext();
  const { navigate } = useAppNavigate();
  const { updateWallet } = useWalletContext();
  const { changeCurrentAccount } = useCurrentAccount();

  const addAccount = useCallback(
    async (
      privateKey: string,
      keyringType: Web3AuthKeyringType,
      isCurrentRequest: IsCurrentRequest,
    ) => {
      const wallet = await walletService.loadWallet();
      if (!isCurrentRequest()) {
        return;
      }

      const clone = wallet.clone();
      const web3AuthKeyring = await Web3AuthKeyring.fromPrivateKeyStr(privateKey, keyringType);
      const account = await SingleAccount.createBy(web3AuthKeyring, clone.nextAccountName);
      if (!isCurrentRequest()) {
        return;
      }

      // A social account always derives the same key, so signing in again would
      // add a second entry for one address.
      const publicKey = arrayToHex(account.publicKey);
      const alreadyAdded = clone.accounts.some(
        (storedAccount) => arrayToHex(storedAccount.publicKey) === publicKey,
      );
      if (alreadyAdded) {
        throw new DuplicateSocialAccountError();
      }

      account.index = clone.lastAccountIndex + 1;
      clone.addAccount(account);
      clone.addKeyring(web3AuthKeyring);
      const storedAccount = clone.accounts.find((storedAccount) => storedAccount.id === account.id);
      if (storedAccount) {
        await changeCurrentAccount(storedAccount);
      }
      await updateWallet(clone);
      if (!isCurrentRequest()) {
        return;
      }

      navigate(RoutePath.WebAccountAddedComplete);
    },
    [navigate, walletService, changeCurrentAccount, updateWallet],
  );

  const createWallet = useCallback(
    async (
      privateKey: string,
      keyringType: Web3AuthKeyringType,
      isCurrentRequest: IsCurrentRequest,
    ) => {
      const createdWallet = await AdenaWallet.createByWeb3Auth(privateKey, keyringType);
      if (!isCurrentRequest()) {
        // Nothing staged it, so zeroize the keyring buffers here.
        createdWallet.destroy();
        return;
      }

      pendingWalletStore.set(createdWallet);
      navigate(RoutePath.WebCreatePassword);
    },
    [navigate],
  );

  const connectAccount = useCallback(
    async (
      privateKey: string,
      keyringType: Web3AuthKeyringType,
      isCurrentRequest: IsCurrentRequest,
    ) => {
      const existWallet = await walletService.existsWallet();
      if (!isCurrentRequest()) {
        return;
      }

      if (existWallet) {
        await addAccount(privateKey, keyringType, isCurrentRequest);
        return;
      }
      await createWallet(privateKey, keyringType, isCurrentRequest);
    },
    [walletService, addAccount, createWallet],
  );

  const connectWithProvider = useCallback(
    async (
      provider: GnoSocialWalletProvider,
      keyringType: Web3AuthKeyringType,
      isCurrentRequest: IsCurrentRequest,
    ) => {
      const connected = await provider.connect();

      // The popup outlives the screen that opened it, so a request the user
      // canceled - or one superseded by a retry - must not commit an account.
      if (!isCurrentRequest()) {
        await provider.disconnect().catch(() => false);
        return;
      }

      if (!connected) {
        throw new Error('Failed to connect the social login provider.');
      }

      let privateKey: string;
      try {
        privateKey = await requestSocialPrivateKey(provider);
      } finally {
        // The key now lives in the wallet's vault; the session is not kept.
        await provider.disconnect().catch(() => false);
      }

      if (!isCurrentRequest()) {
        return;
      }

      await connectAccount(privateKey, keyringType, isCurrentRequest);
    },
    [connectAccount],
  );

  return {
    connectWithProvider,
  };
};

export default useSocialLoginAccount;

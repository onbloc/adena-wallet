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
  ) => Promise<void>;
};

// Turns the key a social provider derived into an Adena account. What happens
// after the key arrives is the same for every provider.
const useSocialLoginAccount = (): UseSocialLoginAccountReturn => {
  const { walletService } = useAdenaContext();
  const { navigate } = useAppNavigate();
  const { updateWallet } = useWalletContext();
  const { changeCurrentAccount } = useCurrentAccount();

  const addAccount = useCallback(
    async (privateKey: string, keyringType: Web3AuthKeyringType) => {
      const wallet = await walletService.loadWallet();

      const clone = wallet.clone();
      const web3AuthKeyring = await Web3AuthKeyring.fromPrivateKeyStr(privateKey, keyringType);
      const account = await SingleAccount.createBy(web3AuthKeyring, clone.nextAccountName);

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
      navigate(RoutePath.WebAccountAddedComplete);
    },
    [navigate, walletService, changeCurrentAccount, updateWallet],
  );

  const createWallet = useCallback(
    async (privateKey: string, keyringType: Web3AuthKeyringType) => {
      const createdWallet = await AdenaWallet.createByWeb3Auth(privateKey, keyringType);
      pendingWalletStore.set(createdWallet);
      navigate(RoutePath.WebCreatePassword);
    },
    [navigate],
  );

  const connectAccount = useCallback(
    async (privateKey: string, keyringType: Web3AuthKeyringType) => {
      const existWallet = await walletService.existsWallet();
      if (existWallet) {
        await addAccount(privateKey, keyringType);
        return;
      }
      await createWallet(privateKey, keyringType);
    },
    [walletService, addAccount, createWallet],
  );

  const connectWithProvider = useCallback(
    async (provider: GnoSocialWalletProvider, keyringType: Web3AuthKeyringType) => {
      const connected = await provider.connect();
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

      await connectAccount(privateKey, keyringType);
    },
    [connectAccount],
  );

  return {
    connectWithProvider,
  };
};

export default useSocialLoginAccount;

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAdenaContext, useWalletContext } from './use-context';

export interface UseWalletReturn {
  hasHDWallet: boolean;
  existWallet: boolean | undefined;
  isLoadingExistWallet: boolean;

  lockedWallet: boolean | undefined;
  isLoadingLockedWallet: boolean;
}

export const useWallet = (): UseWalletReturn => {
  const { walletService } = useAdenaContext();
  const { wallet } = useWalletContext();

  const hasHDWallet = useMemo(() => {
    if (!wallet) {
      return false;
    }
    return wallet.hasHDWallet();
  }, [wallet]);

  // networkMode: 'always' — see landing-screen. Both of these read
  // chrome.storage; paused offline they leave the POPUP blank, because
  // App/popup returns <></> while isLoadingLockedWallet is true.
  const { data: existWallet, isLoading: isLoadingExistWallet } = useQuery(
    ['wallet/existWallet', walletService.id],
    async () => {
      const existWallet = await walletService.existsWallet().catch(() => false);
      return existWallet;
    },
    { networkMode: 'always' },
  );

  const { data: lockedWallet, isLoading: isLoadingLockedWallet } = useQuery(
    ['wallet/locked', walletService.id],
    async () => {
      const lockedWallet = await walletService.isLocked();
      return lockedWallet;
    },
    { networkMode: 'always' },
  );

  return {
    hasHDWallet,
    existWallet,
    isLoadingExistWallet,
    lockedWallet,
    isLoadingLockedWallet,
  };
};

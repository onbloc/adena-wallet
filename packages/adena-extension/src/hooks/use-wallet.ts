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

  const { data: existWallet, isLoading: isLoadingExistWallet } = useQuery(
    ['wallet/existWallet', walletService],
    async () => {
      const existWallet = await walletService.existsWallet().catch(() => false);
      return existWallet;
    },
    {},
  );

  const { data: lockedWallet, isLoading: isLoadingLockedWallet } = useQuery(
    ['wallet/locked', walletService],
    async () => {
      const lockedWallet = await walletService.isLocked();
      return lockedWallet;
    },
    {},
  );

  return {
    hasHDWallet,
    existWallet,
    isLoadingExistWallet,
    lockedWallet,
    isLoadingLockedWallet,
  };
};

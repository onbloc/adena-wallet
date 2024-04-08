import { useQuery } from '@tanstack/react-query';
import { useAdenaContext } from './use-context';

export interface UseWalletReturn {
  existWallet: boolean | undefined;
  isLoadingExistWallet: boolean;

  lockedWallet: boolean | undefined;
  isLoadingLockedWallet: boolean;
}

export const useWallet = (): UseWalletReturn => {
  const { walletService } = useAdenaContext();

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
    existWallet,
    isLoadingExistWallet,
    lockedWallet,
    isLoadingLockedWallet,
  };
};

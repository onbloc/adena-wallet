import { useQuery } from '@tanstack/react-query';
import { useAdenaContext } from './use-context';

export interface UseWalletReturn {
  existWallet: boolean | undefined;
  isLoadingExistWallet: boolean;
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

  return { existWallet, isLoadingExistWallet };
};

import { useQuery } from '@tanstack/react-query';
import { useAdenaContext, useWalletContext } from './use-context';

export interface UseWalletReturn {
  existWallet: boolean;
}

export const useWallet = (): UseWalletReturn => {
  const { wallet } = useWalletContext();
  const { walletService } = useAdenaContext();

  const { data: existWallet = false } = useQuery(
    ['wallet/existWallet', walletService, wallet],
    async () => {
      const existWallet = await walletService.existsWallet().catch(() => false);
      return existWallet;
    },
    {},
  );

  return { existWallet };
};

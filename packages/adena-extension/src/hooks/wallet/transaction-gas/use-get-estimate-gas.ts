import { GasToken } from '@common/constants/token.constant';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { Document } from 'adena-module';

export const GET_ESTIMATE_GAS_KEY = 'transactionGas/useGetEstimateGas';

const REFETCH_INTERVAL = 5_000;

export const useGetEstimateGas = (
  document: Document | null | undefined,
  gasAmount: string,
  options?: UseQueryOptions<number | null, Error>,
): UseQueryResult<number | null> => {
  const { wallet, gnoProvider } = useWalletContext();
  const { transactionGasService } = useAdenaContext();

  return useQuery<number | null, Error>({
    queryKey: [GET_ESTIMATE_GAS_KEY, document, gasAmount],
    queryFn: async () => {
      if (!document || !wallet || !gnoProvider) {
        return null;
      }

      const gasPrice = {
        amount: gasAmount,
        denom: GasToken.denom,
      };

      const estimatedDocument = {
        ...document,
        fee: {
          ...document.fee,
          amount: [gasPrice],
        },
      };

      const signedResult = await wallet.sign(gnoProvider, estimatedDocument).catch(() => null);
      if (!signedResult) {
        return null;
      }

      return transactionGasService.estimateGas(signedResult.signed).catch(() => null);
    },
    refetchInterval: REFETCH_INTERVAL,
    keepPreviousData: true,
    ...options,
  });
};

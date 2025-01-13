import { GasToken } from '@common/constants/token.constant';
import { DEFAULT_GAS_FEE } from '@common/constants/tx.constant';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { NetworkFee } from '@types';
import { Document, documentToDefaultTx } from 'adena-module';
import BigNumber from 'bignumber.js';

export const GET_ESTIMATE_GAS_KEY = 'transactionGas/useGetSingleEstimateGas';

const REFETCH_INTERVAL = 5_000;

function makeTokenAmountWithDecimals(amount: string | number, decimals: number): string {
  return BigNumber(amount)
    .shiftedBy(decimals * -1)
    .toFixed(decimals, BigNumber.ROUND_DOWN)
    .replace(/\.?0+$/, '');
}

export const useGetSingleEstimateGas = (
  document: Document | null | undefined,
  options?: UseQueryOptions<NetworkFee | null, Error>,
): UseQueryResult<NetworkFee | null> => {
  const { wallet, gnoProvider } = useWalletContext();
  const { transactionGasService } = useAdenaContext();

  return useQuery<NetworkFee | null, Error>({
    queryKey: [GET_ESTIMATE_GAS_KEY, document?.msgs, document?.memo],
    queryFn: async () => {
      if (!document || !wallet || !gnoProvider) {
        return null;
      }

      const result = await transactionGasService
        .estimateGas(documentToDefaultTx(document))
        .catch((e: Error) => {
          if (e.message === '/std.InvalidPubKeyError') {
            return DEFAULT_GAS_FEE;
          }

          return null;
        });

      if (!result) {
        return null;
      }

      return {
        denom: GasToken.symbol,
        amount: makeTokenAmountWithDecimals(result, GasToken.decimals),
        estimatedAmount: makeTokenAmountWithDecimals(result, GasToken.decimals),
      };
    },
    refetchInterval: REFETCH_INTERVAL,
    keepPreviousData: true,
    ...options,
  });
};

import { GasToken } from '@common/constants/token.constant';
import { DEFAULT_GAS_FEE } from '@common/constants/tx.constant';
import { Tx } from '@gnolang/tm2-js-client';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { Document, documentToDefaultTx } from 'adena-module';
import BigNumber from 'bignumber.js';
import { GasPriceTier } from './use-get-gas-price';

export const GET_ESTIMATE_GAS_KEY = 'transactionGas/useGetEstimateGas';

const REFETCH_INTERVAL = 5_000;

function makeSimulateTx(document: Document, gasAmount: string): Tx {
  const simulateDocument = {
    ...document,
    fee: {
      ...document.fee,
      amount: [{ amount: gasAmount, denom: GasToken.denom }],
    },
  };

  return documentToDefaultTx(simulateDocument);
}

function makeTokenAmountWithDecimals(amount: string | number, decimals: number): string {
  return BigNumber(amount)
    .shiftedBy(decimals * -1)
    .toFixed(decimals, BigNumber.ROUND_DOWN)
    .replace(/\.?0+$/, '');
}

export const useGetEstimateGas = (
  document: Document | null | undefined,
  gasPriceTiers: GasPriceTier[] | null | undefined,
  options?: UseQueryOptions<GasPriceTier[] | null, Error>,
): UseQueryResult<GasPriceTier[] | null> => {
  const { wallet, gnoProvider } = useWalletContext();
  const { transactionGasService } = useAdenaContext();

  return useQuery<GasPriceTier[] | null, Error>({
    queryKey: [GET_ESTIMATE_GAS_KEY, document?.msgs, document?.memo, gasPriceTiers],
    queryFn: async () => {
      if (!document || !wallet || !gnoProvider || !gasPriceTiers) {
        return null;
      }

      const simulateTxs = gasPriceTiers.map((tier) =>
        makeSimulateTx(document, tier.gasPrice.amount),
      );

      const estimatedGasAmounts = await Promise.all(
        simulateTxs.map((tx) => transactionGasService.estimateGas(tx).catch(() => DEFAULT_GAS_FEE)),
      );

      return gasPriceTiers.map((tier, index) => {
        const estimatedGasAmount = estimatedGasAmounts?.[index] || 0;

        return {
          ...tier,
          gasPrice: {
            denom: GasToken.symbol,
            amount: makeTokenAmountWithDecimals(tier.gasPrice.amount, GasToken.decimals),
            estimatedAmount: makeTokenAmountWithDecimals(estimatedGasAmount, GasToken.decimals),
          },
        };
      });
    },
    refetchInterval: REFETCH_INTERVAL,
    keepPreviousData: true,
    ...options,
  });
};

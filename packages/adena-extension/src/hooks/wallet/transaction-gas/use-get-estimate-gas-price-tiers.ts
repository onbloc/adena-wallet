import { DEFAULT_GAS_PRICE_RATE, DEFAULT_GAS_USED } from '@common/constants/gas.constant';
import { INVALID_PUBLIC_KEY_ERROR_TYPE } from '@common/constants/tx-error.constant';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { NetworkFeeSettingInfo, NetworkFeeSettingType } from '@types';
import { Document } from 'adena-module';
import BigNumber from 'bignumber.js';
import { makeEstimateGasTransaction } from './use-get-estimate-gas-info';
import { useGetGasPrice } from './use-get-gas-price';

export const GET_ESTIMATE_GAS_PRICE_TIERS = 'transactionGas/getEstimateGasPriceTiers';

const REFETCH_INTERVAL = 5_000;

export const useGetEstimateGasPriceTiers = (
  document: Document | null | undefined,
  gasUsed: number | undefined,
  gasAdjustment: string,
  options?: UseQueryOptions<NetworkFeeSettingInfo[] | null, Error>,
): UseQueryResult<NetworkFeeSettingInfo[] | null> => {
  const { transactionGasService, transactionService } = useAdenaContext();
  const { data: gasPrice } = useGetGasPrice();
  const { wallet } = useWalletContext();

  return useQuery<NetworkFeeSettingInfo[] | null, Error>({
    queryKey: [
      GET_ESTIMATE_GAS_PRICE_TIERS,
      transactionGasService,
      document?.msgs,
      document?.memo,
      gasUsed,
      gasAdjustment,
      gasPrice || 0,
    ],
    queryFn: async (): Promise<NetworkFeeSettingInfo[] | null> => {
      if (!transactionService || !transactionGasService || !document || !gasPrice) {
        return null;
      }

      return Promise.all(
        Object.keys(NetworkFeeSettingType).map(async (key) => {
          const tier = key as NetworkFeeSettingType;

          const adjustGasUsedBN = BigNumber(gasUsed || DEFAULT_GAS_USED).multipliedBy(
            DEFAULT_GAS_PRICE_RATE[tier],
          );
          const adjustGasUsed = adjustGasUsedBN.toFixed(0, BigNumber.ROUND_DOWN);
          const adjustedGasPriceBN = BigNumber(gasPrice).multipliedBy(gasAdjustment);
          const adjustedGasPrice = adjustedGasPriceBN.toNumber();
          const gasFee = adjustedGasPriceBN
            .multipliedBy(adjustGasUsed)
            .toFixed(0, BigNumber.ROUND_UP);

          const tx = await makeEstimateGasTransaction(
            wallet,
            transactionService,
            document,
            Number(adjustGasUsed),
            adjustedGasPriceBN.toNumber(),
          );

          console.log('tx', tx);
          console.log('gasUsed', gasUsed);
          console.log('gasPrice', adjustedGasPrice);
          console.log('gasFee', gasFee);
          console.log('document', document);

          if (!tx) {
            return {
              settingType: tier,
              gasInfo: {
                gasFee: 0,
                gasUsed: Number(adjustGasUsed),
                gasWanted: Number(adjustGasUsed),
                gasPrice: adjustedGasPrice,
                hasError: true,
                simulateErrorMessage: 'Failed to simulate transaction',
              },
            };
          }

          const result = await transactionGasService
            .simulateTx(tx)
            .then((simulateResult) => {
              return {
                gasUsed: simulateResult.gasUsed.toNumber(),
                errorMessage: null,
              };
            })
            .catch((e: Error) => {
              if (e?.message === INVALID_PUBLIC_KEY_ERROR_TYPE) {
                return {
                  gasUsed: Number(adjustGasUsed),
                  errorMessage: null,
                };
              }

              return {
                gasUsed: Number(adjustGasUsed),
                errorMessage: e?.message || '',
              };
            });

          return {
            settingType: tier,
            gasInfo: {
              gasFee: Number(gasFee),
              gasUsed: result.gasUsed,
              gasWanted: result.gasUsed,
              gasPrice: adjustedGasPrice,
              hasError: result.errorMessage !== null,
              simulateErrorMessage: result.errorMessage,
            },
          };
        }),
      );
    },
    refetchInterval: REFETCH_INTERVAL,
    keepPreviousData: true,
    enabled: !!transactionGasService && !!document && !!gasPrice,
    ...options,
  });
};

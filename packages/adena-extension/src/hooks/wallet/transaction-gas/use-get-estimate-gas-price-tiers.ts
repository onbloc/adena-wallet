import {
  DEFAULT_GAS_PRICE_RATE,
  GAS_FEE_SAFETY_MARGIN,
  MINIMUM_GAS_PRICE,
} from '@common/constants/gas.constant';
import { GasToken } from '@common/constants/token.constant';
import { useAdenaContext } from '@hooks/use-context';
import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { NetworkFeeSettingInfo, NetworkFeeSettingType } from '@types';
import { Document } from 'adena-module';
import BigNumber from 'bignumber.js';
import { useGetGasPriceTier } from './use-get-gas-price';

export const GET_ESTIMATE_GAS_PRICE_TIERS = 'transactionGas/getEstimateGasPriceTiers';

const REFETCH_INTERVAL = 5_000;

function makeGasInfoBy(
  gasUsed: number | null | undefined,
  gasPrice: number | null | undefined,
  safetyMargin: number,
): {
  gasWanted: number;
  gasFee: number;
} {
  if (!gasUsed || !gasPrice) {
    return {
      gasWanted: 0,
      gasFee: 0,
    };
  }

  const gasWantedBN = BigNumber(gasUsed).multipliedBy(safetyMargin);
  const gasFeeBN = BigNumber(gasUsed).multipliedBy(gasPrice);

  return {
    gasWanted: Number(gasWantedBN.toFixed(0, BigNumber.ROUND_DOWN)),
    gasFee: Number(gasFeeBN.toFixed(0, BigNumber.ROUND_UP)),
  };
}

export const useGetEstimateGasPriceTiers = (
  document: Document | null | undefined,
  gasUsed: number | undefined,
  gasAdjustment: string,
  options?: UseQueryOptions<NetworkFeeSettingInfo[] | null, Error>,
): UseQueryResult<NetworkFeeSettingInfo[] | null> => {
  const { transactionGasService } = useAdenaContext();
  const { data: gasPriceTier, isFetched: isFetchedGasPriceTier } = useGetGasPriceTier(
    GasToken.denom,
  );

  const priceTierKey = gasPriceTier ? Object.keys(gasPriceTier).join(',') : '';

  return useQuery<NetworkFeeSettingInfo[] | null, Error>({
    queryKey: [
      GET_ESTIMATE_GAS_PRICE_TIERS,
      transactionGasService,
      document?.msgs,
      document?.memo,
      gasUsed,
      gasAdjustment,
      priceTierKey,
    ],
    queryFn: async (): Promise<NetworkFeeSettingInfo[] | null> => {
      if (!transactionGasService || !document || gasUsed === undefined || !gasPriceTier) {
        return null;
      }

      return Promise.all(
        Object.keys(gasPriceTier).map(async (key) => {
          const tier = key as NetworkFeeSettingType;
          const gasPrice = gasPriceTier[tier];

          const adjustedGasPriceBN = BigNumber(gasPrice).multipliedBy(gasAdjustment);
          const adjustedGasPrice = adjustedGasPriceBN.isLessThan(MINIMUM_GAS_PRICE)
            ? MINIMUM_GAS_PRICE * DEFAULT_GAS_PRICE_RATE[tier]
            : BigNumber(gasPrice).multipliedBy(gasAdjustment).toNumber();

          const { gasWanted: resultGasWanted, gasFee: resultGasFee } = makeGasInfoBy(
            gasUsed,
            adjustedGasPrice,
            GAS_FEE_SAFETY_MARGIN,
          );

          return {
            settingType: tier,
            gasInfo: {
              gasFee: resultGasFee,
              gasUsed,
              gasWanted: resultGasWanted,
              gasPrice: adjustedGasPrice,
            },
          };
        }),
      );
    },
    refetchInterval: REFETCH_INTERVAL,
    keepPreviousData: true,
    enabled: !!transactionGasService && !!document && isFetchedGasPriceTier,
    ...options,
  });
};

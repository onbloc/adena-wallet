import { GasToken } from '@common/constants/token.constant';
import { useAdenaContext } from '@hooks/use-context';
import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { NetworkFeeSettingType } from '@types';
import BigNumber from 'bignumber.js';

export const GET_ESTIMATE_GAS_KEY = 'transactionGas/useGetGasPriceTires';

const REFETCH_INTERVAL = 5_000;

export type GasPriceTier = {
  settingType: NetworkFeeSettingType;
  gasPrice: {
    amount: string;
    denom: string;
    estimatedAmount: string;
  };
};

const defaultGasPrice = 100_000;
const defaultRatio = 1;

const defaultGasPriceTiers = [
  NetworkFeeSettingType.FAST,
  NetworkFeeSettingType.AVERAGE,
  NetworkFeeSettingType.SLOW,
].map((settingType) => ({
  settingType,
  gasPrice: {
    amount: defaultGasPrice.toString(),
    denom: GasToken.symbol,
    estimatedAmount: '0',
  },
}));

export const useGetGasPriceTires = (
  ratio: string,
  options?: UseQueryOptions<GasPriceTier[], Error>,
): UseQueryResult<GasPriceTier[]> => {
  const { transactionGasService } = useAdenaContext();

  return useQuery<GasPriceTier[], Error>({
    queryKey: [GET_ESTIMATE_GAS_KEY, ratio],
    queryFn: async () => {
      const priceRatio = BigNumber(ratio || defaultRatio).toNumber();

      const gasPrice = await transactionGasService.getGasPrice(GasToken.denom).catch(() => null);
      if (!gasPrice) {
        return defaultGasPriceTiers.map((tier) => ({
          ...tier,
          gasPrice: {
            amount: BigNumber(tier.gasPrice.amount)
              .multipliedBy(priceRatio)
              .toFixed(0, BigNumber.ROUND_DOWN),
            denom: GasToken.symbol,
            estimatedAmount: '0',
          },
        }));
      }

      return [
        {
          settingType: NetworkFeeSettingType.FAST,
          gasPrice: {
            amount: BigNumber(gasPrice.high)
              .multipliedBy(priceRatio)
              .toFixed(0, BigNumber.ROUND_DOWN),
            denom: GasToken.denom,
            estimatedAmount: '0',
          },
        },
        {
          settingType: NetworkFeeSettingType.AVERAGE,
          gasPrice: {
            amount: BigNumber(gasPrice.average)
              .multipliedBy(priceRatio)
              .toFixed(0, BigNumber.ROUND_DOWN),
            denom: GasToken.denom,
            estimatedAmount: '0',
          },
        },
        {
          settingType: NetworkFeeSettingType.SLOW,
          gasPrice: {
            amount: BigNumber(gasPrice.low)
              .multipliedBy(priceRatio)
              .toFixed(0, BigNumber.ROUND_DOWN),
            denom: GasToken.denom,
            estimatedAmount: '0',
          },
        },
      ];
    },
    refetchInterval: REFETCH_INTERVAL,
    keepPreviousData: true,
    ...options,
  });
};

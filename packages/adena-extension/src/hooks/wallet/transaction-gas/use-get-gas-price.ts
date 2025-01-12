import { GasToken } from '@common/constants/token.constant';
import { useAdenaContext } from '@hooks/use-context';
import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { NetworkFeeSettingType } from '@types';
import BigNumber from 'bignumber.js';

export const GET_ESTIMATE_GAS_KEY = 'transactionGas/useGetGasPriceTires';

const REFETCH_INTERVAL = 5_000;

type GasPriceTier = {
  settingType: NetworkFeeSettingType;
  gasPrice: {
    amount: string;
    denom: string;
  };
};

const defaultCustomGasPrice = '1';

const defaultGasPriceTiers = [
  {
    settingType: NetworkFeeSettingType.CUSTOM,
    gasPrice: {
      amount: defaultCustomGasPrice,
      denom: GasToken.symbol,
    },
  },
];

function makeTokenAmountWithDecimals(amount: number, decimals: number): string {
  return BigNumber(amount)
    .shiftedBy(decimals * -1)
    .toString();
}

export const useGetGasPriceTires = (
  options?: UseQueryOptions<GasPriceTier[], Error>,
): UseQueryResult<GasPriceTier[]> => {
  const { transactionGasService } = useAdenaContext();

  return useQuery<GasPriceTier[], Error>({
    queryKey: [GET_ESTIMATE_GAS_KEY],
    queryFn: async () => {
      const gasPrice = await transactionGasService.getGasPrice(GasToken.denom).catch(() => null);
      if (!gasPrice) {
        return defaultGasPriceTiers;
      }

      return [
        {
          settingType: NetworkFeeSettingType.FAST,
          gasPrice: {
            amount: makeTokenAmountWithDecimals(gasPrice.high, GasToken.decimals),
            denom: GasToken.symbol,
          },
        },
        {
          settingType: NetworkFeeSettingType.AVERAGE,
          gasPrice: {
            amount: makeTokenAmountWithDecimals(gasPrice.average, GasToken.decimals),
            denom: GasToken.symbol,
          },
        },
        {
          settingType: NetworkFeeSettingType.SLOW,
          gasPrice: {
            amount: makeTokenAmountWithDecimals(gasPrice.low, GasToken.decimals),
            denom: GasToken.symbol,
          },
        },
        {
          settingType: NetworkFeeSettingType.CUSTOM,
          gasPrice: {
            amount: '',
            denom: GasToken.symbol,
          },
        },
      ];
    },
    refetchInterval: REFETCH_INTERVAL,
    keepPreviousData: true,
    ...options,
  });
};

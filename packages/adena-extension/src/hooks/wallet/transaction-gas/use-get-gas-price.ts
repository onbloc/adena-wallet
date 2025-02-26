import { DEFAULT_GAS_PRICE_STEP, MINIMUM_GAS_PRICE } from '@common/constants/gas.constant';
import { useAdenaContext } from '@hooks/use-context';
import { useNetwork } from '@hooks/use-network';
import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { NetworkFeeSettingType } from '@types';

export const GET_GAS_PRICE = 'transactionGas/useGetGasPrice';

const REFETCH_INTERVAL = 5_000;

export const useGetGasPriceTier = (
  denomination: string,
  options?: UseQueryOptions<Record<NetworkFeeSettingType, number> | null, Error>,
): UseQueryResult<Record<NetworkFeeSettingType, number> | null> => {
  const { currentNetwork } = useNetwork();
  const { transactionGasService } = useAdenaContext();

  return useQuery<Record<NetworkFeeSettingType, number> | null, Error>({
    queryKey: [GET_GAS_PRICE, denomination, transactionGasService],
    queryFn: () => {
      if (!currentNetwork.indexerUrl || !transactionGasService) {
        return DEFAULT_GAS_PRICE_STEP;
      }

      return transactionGasService
        .getGasPrice(denomination)
        .then((tierInfo) => ({
          [NetworkFeeSettingType.FAST]: handleInsufficientGasPrice(
            tierInfo?.high || 0,
            DEFAULT_GAS_PRICE_STEP.FAST,
          ),
          [NetworkFeeSettingType.AVERAGE]: handleInsufficientGasPrice(
            tierInfo?.average || 0,
            DEFAULT_GAS_PRICE_STEP.AVERAGE,
          ),
          [NetworkFeeSettingType.SLOW]: handleInsufficientGasPrice(
            tierInfo?.low || 0,
            DEFAULT_GAS_PRICE_STEP.SLOW,
          ),
        }))
        .catch((e) => {
          console.error(e);
          return null;
        });
    },
    refetchInterval: REFETCH_INTERVAL,
    enabled: !!transactionGasService,
    keepPreviousData: true,
    ...options,
  });
};

function handleInsufficientGasPrice(
  price: number,
  defaultPrice: number,
  overPrice = 1,
  lowerPrice = MINIMUM_GAS_PRICE,
): number {
  if (price >= overPrice || price <= lowerPrice) {
    return defaultPrice;
  }

  throw price;
}

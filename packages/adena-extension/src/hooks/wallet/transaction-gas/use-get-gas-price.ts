import { useAdenaContext } from '@hooks/use-context';
import {
  keepPreviousData, useQuery, UseQueryOptions, UseQueryResult,
} from '@tanstack/react-query';

export const GET_GAS_PRICE = 'transactionGas/useGetGasPrice';

const REFETCH_INTERVAL = 5_000;

export const useGetGasPrice = (
  options?: Omit<UseQueryOptions<number | null, Error>, 'queryKey' | 'queryFn'>,
): UseQueryResult<number | null> => {
  const { transactionGasService } = useAdenaContext();

  return useQuery<number | null, Error>({
    queryKey: [GET_GAS_PRICE, transactionGasService],
    queryFn: () => {
      if (!transactionGasService) {
        return null;
      }

      return transactionGasService.getGasPrice();
    },
    refetchInterval: REFETCH_INTERVAL,
    enabled: !!transactionGasService,
    placeholderData: keepPreviousData,
    ...options,
  });
};

import { useAdenaContext } from '@hooks/use-context';
import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';

export const GET_GAS_PRICE = 'transactionGas/useGetGasPrice';

const REFETCH_INTERVAL = 5_000;

export const useGetGasPrice = (
  options?: UseQueryOptions<number | null, Error>,
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
    keepPreviousData: true,
    ...options,
  });
};

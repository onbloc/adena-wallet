import { AccountInfo } from '@common/provider/gno';
import { useAdenaContext } from '@hooks/use-context';
import { useNetwork } from '@hooks/use-network';
import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useMemo } from 'react';

export const GET_ACCOUNT_INFO = 'accountInfo/useGetAccountInfo';

export const useGetAccountInfo = (
  address: string | null | undefined,
  options?: UseQueryOptions<AccountInfo | null, Error>,
): UseQueryResult<AccountInfo | null> => {
  const { accountService } = useAdenaContext();
  const { currentNetwork } = useNetwork();

  return useQuery<AccountInfo | null, Error>({
    queryKey: [GET_ACCOUNT_INFO, accountService, address || '', currentNetwork?.chainId],
    queryFn: async (): Promise<AccountInfo | null> => {
      if (!accountService || !address) {
        return null;
      }

      return accountService.getAccountInfo(address);
    },
    keepPreviousData: true,
    enabled: !!accountService && !!address,
    ...options,
  });
};

export const useIsInitializedAccount = (
  address: string | null | undefined,
  options?: UseQueryOptions<AccountInfo | null, Error>,
): boolean | null => {
  const result = useGetAccountInfo(address, options);

  return useMemo(() => {
    if (!address || !result.data) {
      return null;
    }

    return result.data?.status === 'ACTIVE' && result.data.publicKey !== null;
  }, [address, result.data, result.isLoading]);
};

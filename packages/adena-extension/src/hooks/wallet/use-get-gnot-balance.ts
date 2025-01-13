import { GNOT_TOKEN } from '@common/constants/token.constant';
import { useWalletContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useNetwork } from '@hooks/use-network';
import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';

export const GET_GNOT_BALANCE_QUERY_KEY = 'wallet/useGetGnotBalance';

export const useGetGnotBalance = (
  options?: UseQueryOptions<number | null, Error>,
): UseQueryResult<number | null> => {
  const { gnoProvider } = useWalletContext();
  const { currentAddress } = useCurrentAccount();
  const { currentNetwork } = useNetwork();

  return useQuery<number | null, Error>({
    queryKey: [GET_GNOT_BALANCE_QUERY_KEY, currentAddress || '', currentNetwork.chainId],
    queryFn: async () => {
      if (!gnoProvider || !currentAddress) {
        return null;
      }

      return gnoProvider.getBalance(currentAddress, GNOT_TOKEN.denom).catch(() => 0);
    },
    keepPreviousData: true,
    ...options,
  });
};

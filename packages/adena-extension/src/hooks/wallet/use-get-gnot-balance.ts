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
  const { currentFundingAddress } = useCurrentAccount();
  const { currentNetwork } = useNetwork();

  return useQuery<number | null, Error>({
    // SessionAccount uses the master address for funding flows: the session
    // address never holds GNOT, every session-signed tx spends master funds.
    queryKey: [GET_GNOT_BALANCE_QUERY_KEY, currentFundingAddress || '', currentNetwork.chainId],
    queryFn: async () => {
      if (!gnoProvider || !currentFundingAddress) {
        return null;
      }

      return gnoProvider.getBalance(currentFundingAddress, GNOT_TOKEN.denom).catch(() => 0);
    },
    keepPreviousData: true,
    ...options,
  });
};

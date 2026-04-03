import {
  GNOT_TOKEN,
} from '@common/constants/token.constant'
import {
  useWalletContext,
} from '@hooks/use-context'
import {
  useCurrentAccount,
} from '@hooks/use-current-account'
import {
  useNetwork,
} from '@hooks/use-network'
import {
  keepPreviousData, useQuery, UseQueryOptions, UseQueryResult,
} from '@tanstack/react-query'

export const GET_GNOT_BALANCE_QUERY_KEY = 'wallet/useGetGnotBalance'

export const useGetGnotBalance = (
  options?: Omit<UseQueryOptions<number | null, Error>, 'queryKey' | 'queryFn'>,
): UseQueryResult<number | null> => {
  const {
    gnoProvider,
  } = useWalletContext()
  const {
    currentAddress,
  } = useCurrentAccount()
  const {
    currentNetwork,
  } = useNetwork()

  return useQuery<number | null, Error>({
    queryKey: [GET_GNOT_BALANCE_QUERY_KEY, currentAddress || '', currentNetwork.chainId],
    queryFn: async () => {
      if (!gnoProvider || !currentAddress) {
        return null
      }

      return gnoProvider.getBalance(currentAddress, GNOT_TOKEN.denom).catch(() => 0)
    },
    placeholderData: keepPreviousData,
    ...options,
  })
}

import { useQuery, UseQueryResult } from '@tanstack/react-query';

import { useContainer } from '../di/container-provider';
import { Account } from '../domain/account';
import { Network } from '../domain/network';
import { SessionCard } from '../domain/session-card';
import { NO_ID_KEY, queryKeys } from './query-keys';

// Spend counters move with every tx the card signs, so the list is polled while visible.
const CARD_REFETCH_INTERVAL_MS = 15_000;

export const useSessionCardsQuery = (account: Account | null, network: Network): UseQueryResult<SessionCard[], Error> => {
  const { sessionCardService } = useContainer();

  return useQuery({
    queryKey: queryKeys.sessionCards(network.id, account?.id ?? NO_ID_KEY),
    queryFn: () => sessionCardService.listCards(account as Account, network),
    enabled: Boolean(account) && sessionCardService.isSupported(network),
    refetchInterval: CARD_REFETCH_INTERVAL_MS,
  });
};

export const useSessionCardQuery = (account: Account | null, network: Network, sessionAddress: string): UseQueryResult<SessionCard | null, Error> => {
  const { sessionCardService } = useContainer();

  return useQuery({
    queryKey: queryKeys.sessionCard(network.id, account?.id ?? NO_ID_KEY, sessionAddress),
    queryFn: () => sessionCardService.getCard(account as Account, network, sessionAddress),
    enabled: Boolean(account) && sessionCardService.isSupported(network),
    refetchInterval: CARD_REFETCH_INTERVAL_MS,
  });
};

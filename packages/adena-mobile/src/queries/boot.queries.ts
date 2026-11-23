import { useQuery, UseQueryResult } from '@tanstack/react-query';

import { AppContainer } from '../di/container';
import { createNativeContainer } from '../di/create-native-container';
import { queryKeys } from './query-keys';

// Builds the production container once per root; `refetch` retries a failed boot.
export const useNativeContainerQuery = (): UseQueryResult<AppContainer> =>
  useQuery({
    queryKey: queryKeys.boot(),
    queryFn: createNativeContainer,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });

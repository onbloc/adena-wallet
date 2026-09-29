import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { TokenBalanceType } from '@types';

import {
  buildTokenOrderScope,
  readTokenOrder,
  tokenRowKey,
  writeTokenOrder,
} from './helpers/token-order-cache';
import { useCurrentAccount } from './use-current-account';
import { useNetwork } from './use-network';

const TOKEN_ORDER_QUERY_KEY = 'token-order';

/**
 * The token order remembered for the current account and chain.
 *
 * Kept in the query cache so the screens that each mount `useTokenBalance`
 * share one read of `chrome.storage` and one view of the order, instead of
 * racing their own reads.
 */
export const useTokenOrder = (): {
  /** The last settled order, or `null` before it is read / when none is stored. */
  storedOrder: string[] | null;
  /**
   * Whether the stored order is known yet — either read back, or established
   * as unavailable. Callers must not order rows before this is true: doing so
   * renders a provisional order that the stored one then rearranges, which is
   * the reshuffle this hook exists to prevent.
   */
  isOrderResolved: boolean;
  /** Record the order these rows are in now, when it differs from the stored one. */
  persistOrder: (rows: TokenBalanceType[]) => void;
} => {
  const { currentAccount } = useCurrentAccount();
  const { currentNetwork, currentAtomoneNetwork } = useNetwork();
  const queryClient = useQueryClient();

  const scope = useMemo(() => {
    if (!currentAccount) {
      return null;
    }
    return buildTokenOrderScope(
      currentAccount.id,
      currentNetwork.networkId,
      currentAtomoneNetwork?.id,
    );
  }, [currentAccount?.id, currentNetwork.networkId, currentAtomoneNetwork?.id]);

  const { data: storedOrder = null, isFetched } = useQuery<string[] | null>(
    [TOKEN_ORDER_QUERY_KEY, scope],
    () => (scope === null ? null : readTokenOrder(scope)),
    {
      enabled: scope !== null,
      // Storage is only ever written through persistOrder below, which updates
      // this entry itself, so there is nothing for a refetch to pick up.
      staleTime: Infinity,
      cacheTime: Infinity,
    },
  );

  // With no account there is nothing to scope an order to, and the query stays
  // disabled — so it never fetches and `isFetched` never flips. That is still a
  // resolved state: the answer is "no stored order", and callers may proceed.
  const isOrderResolved = scope === null || isFetched;

  const persistOrder = useCallback(
    (rows: TokenBalanceType[]): void => {
      if (scope === null || rows.length === 0) {
        return;
      }

      const order = rows.map((row) => tokenRowKey(row.tokenId, row.networkId));
      const queryKey = [TOKEN_ORDER_QUERY_KEY, scope];
      const stored = queryClient.getQueryData<string[] | null>(queryKey);

      if (stored && isSameOrder(stored, order)) {
        return;
      }

      // Publish before the write so every other mounted screen sees the new
      // order immediately, and so a second caller arriving while the write is
      // still in flight sees it as already stored rather than writing it again.
      queryClient.setQueryData(queryKey, order);
      void writeTokenOrder(scope, order);
    },
    [scope, queryClient],
  );

  return { storedOrder, isOrderResolved, persistOrder };
};

function isSameOrder(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((key, index) => key === b[index]);
}

import type {TransactionInfo} from '@types';
import {useCallback, useEffect, useRef, useState} from 'react';

import {
  fetchHistoryPage,
  HistoryScope,
  INDEXER_PAGE_SIZE,
  makeUnitMap,
  prepareForDisplay,
} from './history';
import {useTokens} from './use-tokens';
import {useWallet} from './wallet-context';

/**
 * A history list that grows on `loadMore`: cursor pages from the API server,
 * or the indexer's full list shown a page at a time.
 */
export function useHistory(scope: HistoryScope) {
  const {net, address} = useWallet();
  // Token decimals are needed to show GRC20 amounts, so wait for the list.
  const {tokens, loading: tokensLoading} = useTokens();
  const [items, setItems] = useState<TransactionInfo[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const cursor = useRef<string | null>(null);
  // Indexer: everything fetched once, revealed INDEXER_PAGE_SIZE at a time.
  const pending = useRef<TransactionInfo[]>([]);
  const scopeKey = JSON.stringify(scope);
  const supported = !!net?.transactionHistoryService.supported;

  const reveal = useCallback(
    async (raw: TransactionInfo[], append: boolean) => {
      if (!net) {
        return;
      }
      const prepared = await prepareForDisplay(net, raw, makeUnitMap(tokens));
      setItems(current => (append ? [...current, ...prepared] : prepared));
    },
    [net, tokens],
  );

  const load = useCallback(
    async (append: boolean) => {
      if (!net || !address || !supported) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setFailed(false);
      try {
        if (append && pending.current.length > 0) {
          const next = pending.current.slice(0, INDEXER_PAGE_SIZE);
          pending.current = pending.current.slice(INDEXER_PAGE_SIZE);
          await reveal(next, true);
          setHasMore(pending.current.length > 0 || !!cursor.current);
          return;
        }
        const page = await fetchHistoryPage(
          net,
          address,
          JSON.parse(scopeKey) as HistoryScope,
          append ? cursor.current : null,
        );
        cursor.current = page.page.hasNext ? page.page.cursor : null;
        let shown = page.transactions;
        if (!net.transactionHistoryService.supportedApi) {
          shown = page.transactions.slice(0, INDEXER_PAGE_SIZE);
          pending.current = page.transactions.slice(INDEXER_PAGE_SIZE);
        }
        await reveal(shown, append);
        setHasMore(pending.current.length > 0 || !!cursor.current);
      } catch {
        setFailed(true);
      } finally {
        setLoading(false);
      }
    },
    [net, address, supported, scopeKey, reveal],
  );

  useEffect(() => {
    if (tokensLoading) {
      return;
    }
    cursor.current = null;
    pending.current = [];
    setItems([]);
    load(false);
    // Re-run when the account, network or scope changes, not on token reloads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [net, address, scopeKey, tokensLoading]);

  return {
    items,
    hasMore,
    loading: loading || tokensLoading,
    failed,
    supported,
    refresh: () => load(false),
    loadMore: () => load(true),
  };
}

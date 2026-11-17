import type {TokenModel} from '@types';
import {useCallback, useEffect, useState} from 'react';

import {
  fetchTokenBalances,
  setTokenDisplay,
  syncTokenList,
  TokenBalance,
} from './tokens';
import {useWallet} from './wallet-context';

/**
 * The current account's tokens on the current network with balances: the
 * extension's wallet-main token list, re-read on `refresh`.
 */
export function useTokens() {
  const {net, account, address} = useWallet();
  const [tokens, setTokens] = useState<TokenModel[]>([]);
  const [balances, setBalances] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const accountId = account?.id;

  const refresh = useCallback(async () => {
    if (!net || !accountId || !address) {
      return;
    }
    setLoading(true);
    setFailed(false);
    try {
      const list = await syncTokenList(net, accountId, address);
      setTokens(list);
      const read: TokenBalance[] = await fetchTokenBalances(
        net,
        address,
        list.filter(token => token.display),
      );
      setBalances(
        Object.fromEntries(read.map(item => [item.token.tokenId, item.raw])),
      );
    } catch {
      // The token resource or the chain did not answer: keep what is shown,
      // and let the GNOT balance load on its own.
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [net, accountId, address]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setDisplay = useCallback(
    async (tokenId: string, display: boolean) => {
      if (!net || !accountId) {
        return;
      }
      setTokens(list =>
        list.map(token =>
          token.tokenId === tokenId ? {...token, display} : token,
        ),
      );
      await setTokenDisplay(net, accountId, tokenId, display);
    },
    [net, accountId],
  );

  return {
    tokens,
    shown: tokens.filter(token => token.display),
    balances,
    loading,
    failed,
    refresh,
    setDisplay,
  };
}

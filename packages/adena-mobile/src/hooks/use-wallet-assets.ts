import { useEffect, useMemo, useState } from 'react';

import { Account } from '../domain/account';
import { Network } from '../domain/network';
import { ManagedToken } from '../domain/token';
import { AssetView, buildAssetViews } from '../presenters/asset.presenter';
import { useTokenBalancesQuery, useTokenListQuery, useTokenPricesQuery } from '../queries/token.queries';
import { PortfolioValue, PriceService, TokenPriceMap } from '../services/price.service';
import { useWalletSnapshot } from './use-wallet-snapshot';

// How long the first paint waits for prices once the list and balances are in.
export const PRICE_GRACE_MS = 800;

// `loading` until the token list and balances (plus the price grace) are in; `error` only when there is nothing to show.
export type AssetsStatus = 'loading' | 'ready' | 'error';

// Visible tokens of the current account/network with balances, prices and the portfolio total.
export interface UseWalletAssetsReturn {
  account: Account | null;
  network: Network;
  status: AssetsStatus;
  tokens: ManagedToken[];
  allTokens: ManagedToken[];
  assets: AssetView[];
  portfolio: PortfolioValue | null;
  // True while USD values are still expected; value cells and the total show placeholders.
  pricesLoading: boolean;
  prices?: TokenPriceMap;
  error: Error | null;
  loading: boolean;
  // Only the token list, so screens can tell "still loading" from "not on this network".
  tokensLoading: boolean;
  refreshing: boolean;
  refetch: () => Promise<void>;
}

export const useWalletAssets = (): UseWalletAssetsReturn => {
  const { account, network } = useWalletSnapshot();
  const tokenList = useTokenListQuery(account, network);
  const tokens = useMemo(() => (tokenList.data ?? []).filter(token => token.visible), [tokenList.data]);
  const balances = useTokenBalancesQuery(account, network, tokens);
  const prices = useTokenPricesQuery(network, tokens);

  const scope = `${network.id}:${account?.id ?? ''}`;
  const listReady = tokenList.data !== undefined && (tokens.length === 0 || balances.data !== undefined);
  // A disabled query (unsupported network) stays pending but idle.
  const pricesSettled = prices.data !== undefined || prices.isError || (prices.isPending && prices.fetchStatus === 'idle');
  const [graceScope, setGraceScope] = useState<string | null>(null);
  const graceElapsed = graceScope === scope;

  useEffect(() => {
    if (!listReady || pricesSettled || graceElapsed) {
      return undefined;
    }

    const timer = setTimeout(() => setGraceScope(scope), PRICE_GRACE_MS);

    return (): void => clearTimeout(timer);
  }, [graceElapsed, listReady, pricesSettled, scope]);

  const error = tokenList.error ?? balances.error;
  const status: AssetsStatus = listReady && (pricesSettled || graceElapsed) ? 'ready' : error && !listReady ? 'error' : 'loading';
  const pricesLoading = !pricesSettled;

  const assets = useMemo(
    () => buildAssetViews(tokens, balances.data, prices.data, balances.isPending || balances.isPlaceholderData, pricesLoading),
    [balances.data, balances.isPending, balances.isPlaceholderData, prices.data, pricesLoading, tokens],
  );
  const portfolio = useMemo(
    () => (balances.data && prices.data
      ? PriceService.portfolio(tokens.map(token => ({ token, amount: balances.data?.[token.id] })), prices.data)
      : null),
    [balances.data, prices.data, tokens],
  );

  return {
    account,
    network,
    status,
    tokens,
    allTokens: tokenList.data ?? [],
    assets,
    portfolio,
    pricesLoading,
    prices: prices.data,
    error,
    loading: status === 'loading',
    tokensLoading: tokenList.isPending,
    refreshing: balances.isRefetching || tokenList.isRefetching,
    refetch: async (): Promise<void> => {
      await tokenList.refetch();
      await Promise.all([balances.refetch(), prices.refetch()]);
    },
  };
};

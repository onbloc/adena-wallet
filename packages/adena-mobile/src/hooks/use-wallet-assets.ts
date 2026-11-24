import { useMemo } from 'react';

import { Account } from '../domain/account';
import { Network } from '../domain/network';
import { ManagedToken } from '../domain/token';
import { AssetView, buildAssetViews } from '../presenters/asset.presenter';
import { useTokenBalancesQuery, useTokenListQuery, useTokenPricesQuery } from '../queries/token.queries';
import { PortfolioValue, PriceService, TokenPriceMap } from '../services/price.service';
import { useWalletSnapshot } from './use-wallet-snapshot';

// Visible tokens of the current account/network with balances, prices and the portfolio total.
export interface UseWalletAssetsReturn {
  account: Account | null;
  network: Network;
  tokens: ManagedToken[];
  allTokens: ManagedToken[];
  assets: AssetView[];
  portfolio: PortfolioValue | null;
  prices?: TokenPriceMap;
  error: Error | null;
  loading: boolean;
  refreshing: boolean;
  refetch: () => Promise<void>;
}

export const useWalletAssets = (): UseWalletAssetsReturn => {
  const { account, network } = useWalletSnapshot();
  const tokenList = useTokenListQuery(account, network);
  const tokens = useMemo(() => (tokenList.data ?? []).filter(token => token.visible), [tokenList.data]);
  const balances = useTokenBalancesQuery(account, network, tokens);
  const prices = useTokenPricesQuery(network, tokens);

  const assets = useMemo(
    () => buildAssetViews(tokens, balances.data, prices.data, tokenList.isPending || balances.isPending),
    [balances.data, balances.isPending, prices.data, tokenList.isPending, tokens],
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
    tokens,
    allTokens: tokenList.data ?? [],
    assets,
    portfolio,
    prices: prices.data,
    error: tokenList.error ?? balances.error,
    loading: tokenList.isPending || balances.isPending,
    refreshing: balances.isRefetching || tokenList.isRefetching,
    refetch: async (): Promise<void> => {
      await tokenList.refetch();
      await Promise.all([balances.refetch(), prices.refetch()]);
    },
  };
};

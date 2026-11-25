import { AssetItemView } from '../components/view-models';
import { SMALL_BALANCE_USD } from '../domain/preferences';
import { isUnknownToken, ManagedToken, Token, TokenPrice, tokenPriceKey, TokenSource } from '../domain/token';
import { PriceService, TokenPriceMap } from '../services/price.service';
import { formatTokenAmount } from '../utils/amount';
import { changeTrend, formatChangeRate, formatUSD, Trend } from '../utils/price';

export interface AssetView {
  token: Token;
  amount?: string;
  quantityLabel?: string;
  valueLabel?: string;
  changeLabel?: string;
  trend: Trend;
  usdValue: number | null;
  loading: boolean;
  // The balance is known but its USD value is still expected.
  valueLoading: boolean;
}

export const toAssetView = (
  token: Token,
  amount: string | undefined,
  price: TokenPrice | undefined,
  loading: boolean,
  pricesLoading = false,
): AssetView => {
  const usdValue = amount === undefined ? null : PriceService.valueOf(amount, token, price);

  return {
    token,
    amount,
    quantityLabel: amount === undefined ? undefined : `${formatTokenAmount(amount, token.decimals)} ${token.symbol}`,
    valueLabel: usdValue === null ? undefined : formatUSD(usdValue),
    changeLabel: price?.change24h === null || price?.change24h === undefined ? undefined : formatChangeRate(price.change24h),
    trend: changeTrend(price?.change24h),
    usdValue,
    loading,
    valueLoading: !loading && pricesLoading && !price,
  };
};

// Native token first, then by USD value, then by symbol.
export const sortAssets = (assets: AssetView[]): AssetView[] =>
  [...assets].sort((a, b) => {
    if (a.token.isNative !== b.token.isNative) return a.token.isNative ? -1 : 1;

    const valueDiff = (b.usdValue ?? -1) - (a.usdValue ?? -1);

    return valueDiff !== 0 ? valueDiff : a.token.symbol.localeCompare(b.token.symbol);
  });

export const buildAssetViews = (
  tokens: Token[],
  balances: Record<string, string> | undefined,
  prices: TokenPriceMap | undefined,
  balancesLoading: boolean,
  pricesLoading = false,
): AssetView[] =>
  sortAssets(tokens.map((token) => {
    const amount = balances?.[token.id];

    // Per token, so a newly shown token loads alone while the others keep their values.
    return toAssetView(token, amount, prices?.[tokenPriceKey(token.id, token.networkId)], balancesLoading && amount === undefined, pricesLoading);
  }));

export const toAssetItem = (view: AssetView): AssetItemView => ({
  key: view.token.id,
  symbol: view.token.symbol,
  name: view.token.name,
  localIcon: view.token.localIcon,
  imageUrl: view.token.imageUrl,
  quantity: view.quantityLabel,
  value: view.valueLabel,
  change: view.changeLabel,
  trend: view.trend,
  loading: view.loading,
  valueLoading: view.valueLoading,
});

export interface PortfolioFilter {
  hideSmallBalances: boolean;
  hideUnknownTokens: boolean;
}

// Shared by Home and Add token so a token hidden here is never shown as already added.
export const isHiddenAsUnknown = (token: ManagedToken, hideUnknownTokens: boolean): boolean => hideUnknownTokens && isUnknownToken(token);

// Home list filter: small means a known USD value under the threshold; the native coin and user-added tokens always stay.
export const filterPortfolioAssets = (assets: AssetView[], tokens: ManagedToken[], filter: PortfolioFilter): AssetView[] =>
  assets.filter((asset) => {
    const managed = tokens.find(token => token.id === asset.token.id);

    if (asset.token.isNative || managed?.source === TokenSource.CUSTOM) {
      return true;
    }

    if (managed && isHiddenAsUnknown(managed, filter.hideUnknownTokens)) {
      return false;
    }

    return !(filter.hideSmallBalances && asset.usdValue !== null && asset.usdValue < SMALL_BALANCE_USD);
  });

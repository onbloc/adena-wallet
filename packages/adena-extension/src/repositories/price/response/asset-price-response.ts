/**
 * `GET /v1/prices` payload (onbloc-api-v3). Prices are decimal strings kept
 * exactly as the upstream market data feed published them, so no precision is
 * lost before the client does its own arithmetic.
 */
export interface AssetPricesResponse {
  items: AssetPriceItem[];
}

export interface AssetPriceItem {
  /** Feed asset id: a CoinMarketCap slug (`gno-land`), not a ticker. */
  assetId: string;
  name: string;
  symbol: string;
  providerAssetId: number;
  quoteCurrency: string;
  provider: string;
  price: string;
  /** `fresh` | `stale` | `unavailable`. */
  status: string;
  priceAt: string | null;
  /**
   * Nullable on purpose: a feed collecting for less than a day genuinely has
   * no day-old price, and 0 would read as a 100% drop.
   */
  oneDayAgoPrice: string | null;
  oneDayAgoPriceAt: string | null;
  changeRateOneDay: number | null;
}

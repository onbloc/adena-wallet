export interface TokenPrice {
  tokenId: string;
  networkId: string;
  /** Price of one whole token unit (not the base denom) in USD. */
  usd: number;
  /** 24h change in percent. `2.5` means +2.5%. Null when the feed has no day-old price. */
  change24h: number | null;
}

/** Keyed by `getTokenPriceKey(tokenId, networkId)`. */
export type TokenPriceMap = Record<string, TokenPrice>;

export interface TokenPriceRequest {
  tokenId: string;
  networkId: string;
}

/**
 * One market asset's quote as served by the price API. Assets are market-wide,
 * not chain-scoped: the wallet bridges its tokens to a quote through the
 * static TOKEN_ASSET_IDS map.
 */
export interface AssetPrice {
  /** Feed asset id — a CoinMarketCap slug such as `gno-land`, not a ticker. */
  assetId: string;
  usd: number;
  /**
   * 24h change in percent, or null when the feed has no day-old price to
   * compare against. Null is not 0%: reporting a missing baseline as a flat
   * rate would claim the price has not moved.
   */
  change24h: number | null;
}

/** A token balance converted to USD, plus the quote it was derived from. */
export interface TokenValue {
  usdValue: number;
  change24h: number | null;
}

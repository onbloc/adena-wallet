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
  /**
   * The token's own decimals, needed only by a token quoted in another asset's
   * unit (see `quoteDecimals` in the asset bindings). Absent for a token whose
   * metadata has not loaded yet.
   */
  decimals?: number;
}

/**
 * One asset's quote as served by the price API. Assets are market-wide, not
 * chain-scoped: the wallet bridges its tokens to a quote through the static
 * asset bindings in `token-price.constant`.
 */
export interface AssetPrice {
  /**
   * Feed asset id. A market asset is a CoinMarketCap slug (`gno-land`); a GRC20
   * asset is the on-chain registry key `{packagePath}.{symbol}`, which is also
   * the wallet's own token id for that token.
   */
  assetId: string;
  /**
   * Who published the quote (`CMC`, `gnoswap`). Two providers can quote the
   * same asset at different prices, so this decides which one the wallet reads.
   */
  provider: string;
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

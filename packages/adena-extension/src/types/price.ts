export interface TokenPrice {
  tokenId: string;
  networkId: string;
  /** Price of one whole token unit (not the base denom) in USD. */
  usd: number;
  /** 24h change in percent. `2.5` means +2.5%. */
  change24h: number;
}

/** Keyed by `getTokenPriceKey(tokenId, networkId)`. */
export type TokenPriceMap = Record<string, TokenPrice>;

export interface TokenPriceRequest {
  tokenId: string;
  networkId: string;
  symbol: string;
}

/** A token balance converted to USD, plus the quote it was derived from. */
export interface TokenValue {
  usdValue: number;
  change24h: number;
}

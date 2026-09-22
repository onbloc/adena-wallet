export interface MockTokenPrice {
  usd: number;
  change24h: number;
}

/**
 * Placeholder quotes keyed by token symbol, until the price API lands.
 * A symbol missing here resolves to no quote, same as an unlisted GRC20.
 */
export const MOCK_TOKEN_PRICES: Record<string, MockTokenPrice> = {
  GNOT: { usd: 1.24, change24h: 5.12 },
  ATONE: { usd: 3.87, change24h: -2.04 },
  PHOTON: { usd: 0.42, change24h: 3.29 },
  GNS: { usd: 0.086, change24h: -0.87 },
  FOO: { usd: 12.5, change24h: 0 },
};

/** Simulated round-trip so callers exercise the same async path as the real API. */
export const MOCK_RESPONSE_DELAY = 150;

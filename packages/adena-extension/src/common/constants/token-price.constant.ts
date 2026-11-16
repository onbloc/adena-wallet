import { getTokenPriceKey } from '@common/utils/price-utils';

/**
 * Quote providers the price API serves, most trusted first.
 *
 * The same asset can arrive from more than one provider at two different
 * prices: CoinMarketCap aggregates the centralised markets, gnoswap reports
 * what its own pools traded at. CMC leads because it is the broader market;
 * gnoswap is what answers for the GRC20 tokens no exchange lists.
 */
export const PRICE_PROVIDER_PRIORITY: readonly string[] = ['cmc', 'gnoswap'];

/**
 * Rank of a provider within PRICE_PROVIDER_PRIORITY. A provider the wallet does
 * not know about ranks behind every one it does, rather than being dropped — a
 * quote from a new source is still better than no quote.
 */
export function getPriceProviderRank(provider: string): number {
  const rank = PRICE_PROVIDER_PRIORITY.indexOf(provider.trim().toLowerCase());
  return rank === -1 ? PRICE_PROVIDER_PRIORITY.length : rank;
}

/** How a wallet token is quoted: which asset to read, and in whose unit. */
export interface TokenAssetBinding {
  /** The price API asset id to read this token's quote from. */
  assetId: string;
  /**
   * Decimals the quoted asset's price is per one unit of, so the quote can be
   * restated in whatever decimals this token's own metadata declares. Needed
   * only by a token quoted as some other asset; leaving it unset means the quote
   * is already per one whole token, which holds for every token quoted under its
   * own asset.
   */
  quoteDecimals?: number;
}

/**
 * Adena token identity → price API asset binding.
 *
 * The two vocabularies do not overlap for market assets: the wallet identifies
 * a token by its denom (or a network-qualified denom for cosmos chains), while
 * the price API identifies a market asset by a CoinMarketCap slug. Tickers look
 * like they could bridge them, but they are not unique — any GRC20 may call
 * itself GNOT — so the bridge is declared here.
 *
 * GRC20 tokens need no entry: the wallet identifies them by the registry key
 * `{packagePath}.{symbol}`, which is exactly the asset id the API publishes
 * gnoswap's pool prices under, so the fallback in `getTokenAssetBinding`
 * already addresses them. An entry here is for a token that must be quoted as
 * something other than itself.
 *
 * Keyed by `getTokenPriceKey(tokenId, networkId)`, so an entry binds a token to
 * an asset on one network only.
 */
const TOKEN_ASSET_BINDINGS: Readonly<Record<string, TokenAssetBinding>> = {
  // Gno.land mainnet native token. Deliberately CMC's `gno-land` rather than
  // gnoswap's own `ugnot` quote: GNOT trades on exchanges, and the wider market
  // is the honest price for the coin the whole portfolio is denominated in.
  [getTokenPriceKey('ugnot', 'gnoland-1')]: { assetId: 'gno-land' },
  /**
   * wugnot is GNOT wrapped 1:1, so it is quoted as GNOT — not as gnoswap's
   * `gno.land/r/gnoland/wugnot.wugnot`, which tracks a single pool and would
   * let the wrapper drift from the coin it is redeemable for.
   *
   * `gno-land` is priced per GNOT, which is 10^6 ugnot, while the wrapper counts
   * in units of its own `decimals` — the one token whose curated decimals differ
   * from what its contract reports. quoteDecimals is what restates the quote in
   * whichever of the two the wallet ends up reading, instead of assuming the
   * wrapper counts the same way GNOT does.
   */
  [getTokenPriceKey('gno.land/r/gnoland/wugnot.wugnot', 'gnoland-1')]: {
    assetId: 'gno-land',
    quoteDecimals: 6,
  },
  // AtomOne mainnet native tokens; their tokenId is already network-qualified.
  [getTokenPriceKey('atomone-1:uatone', 'atomone-1')]: { assetId: 'atomone' },
  [getTokenPriceKey('atomone-1:uphoton', 'atomone-1')]: { assetId: 'photon-atom-one' },
};

/**
 * Networks whose tokens may carry a quote at all.
 *
 * Testnets are absent on purpose, and the list — rather than the unmapped
 * fallback alone — is what keeps them out: a testnet shares its denoms and
 * realm paths with mainnet (`ugnot`, `gno.land/r/...`), so trusting the token id
 * would put a real dollar figure on a token that cannot be sold. The token
 * registry follows the same rule by leaving `priceId` unset on testnet entries.
 */
const PRICED_NETWORK_IDS: readonly string[] = ['gnoland-1', 'atomone-1'];

/**
 * How to quote this token, or null when the wallet must leave it unpriced —
 * a token with no id, or one on a network whose assets are not real markets.
 *
 * An unmapped token on a priced network is quoted under its own tokenId, which
 * is what prices GRC20 tokens: their id is the registry key the API publishes
 * gnoswap prices under. The feed simply has no such asset for a token nobody
 * quotes, and the row keeps its balance-only layout.
 */
export function getTokenAssetBinding(tokenId: string, networkId: string): TokenAssetBinding | null {
  if (tokenId === '' || !PRICED_NETWORK_IDS.includes(networkId)) {
    return null;
  }

  return TOKEN_ASSET_BINDINGS[getTokenPriceKey(tokenId, networkId)] ?? { assetId: tokenId };
}

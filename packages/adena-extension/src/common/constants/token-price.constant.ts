import { getTokenPriceKey } from '@common/utils/price-utils';

/**
 * Adena token identity → onbloc API asset id.
 *
 * The two vocabularies do not overlap: the wallet identifies a token by its
 * denom (or a network-qualified denom for cosmos chains), while the price API
 * identifies a market asset by a CoinMarketCap slug. Tickers look like they
 * could bridge them, but they are not unique — any GRC20 may call itself GNOT
 * — so the bridge is declared here, one entry per token the wallet prices.
 *
 * Keyed by `getTokenPriceKey(tokenId, networkId)`, so an entry binds a token to
 * an asset on one network only. A token with no entry falls back to its own
 * tokenId, which the feed answers for only if the two happen to agree.
 *
 * Testnet tokens are deliberately absent, so a testnet ATONE asks the feed for
 * "atomone-testnet-1:uatone" and comes back unquoted. Mapping it would put a
 * real dollar figure on a token that cannot be sold — the same rule the token
 * registry already follows by leaving `priceId` unset on its testnet entries.
 */
export const TOKEN_ASSET_IDS: Readonly<Record<string, string>> = {
  // Gno.land mainnet native token.
  [getTokenPriceKey('ugnot', 'gnoland-1')]: 'gno-land',
  // AtomOne mainnet native tokens; their tokenId is already network-qualified.
  [getTokenPriceKey('atomone-1:uatone', 'atomone-1')]: 'atomone',
  [getTokenPriceKey('atomone-1:uphoton', 'atomone-1')]: 'photon-atom-one',
};

/**
 * The asset id to quote this token under: its mapped asset, or the tokenId
 * itself when unmapped. Null only for a token with no id at all, which cannot
 * address anything.
 */
export function getTokenAssetId(tokenId: string, networkId: string): string | null {
  if (tokenId === '') {
    return null;
  }

  return TOKEN_ASSET_IDS[getTokenPriceKey(tokenId, networkId)] ?? tokenId;
}

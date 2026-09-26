import BigNumber from 'bignumber.js';

import { AssetPrice, TokenPrice, TokenPriceMap, TokenPriceRequest } from '@types';

import { getPriceProviderRank, getTokenAssetBinding } from '@common/constants/token-price.constant';
import { getTokenPriceKey } from '@common/utils/price-utils';
import { ITokenPriceRepository } from '@repositories/price';

/**
 * Fiat quotes for the tokens the wallet displays.
 *
 * The price API quotes assets, not chain tokens, so a wallet token is bridged
 * to a quote through the static asset bindings. Market assets are bound
 * explicitly; a GRC20 token is quoted under its own registry key, which is the
 * asset id gnoswap's prices arrive with. A token the feed does not price simply
 * has no quote, and its row keeps the balance-only layout.
 */
export class TokenPriceService {
  private tokenPriceRepository: ITokenPriceRepository;

  constructor(tokenPriceRepository: ITokenPriceRepository) {
    this.tokenPriceRepository = tokenPriceRepository;
  }

  /**
   * Identity of the endpoint these quotes come from. A network switch rebuilds
   * this service against another API, and quotes are not interchangeable
   * between the two; empty when the network has no price API at all.
   */
  public get sourceId(): string {
    return this.tokenPriceRepository.apiUrl ?? '';
  }

  public async getTokenPrices(requests: TokenPriceRequest[]): Promise<TokenPriceMap> {
    if (requests.length === 0) {
      return {};
    }

    return this.fetchPrices(requests);
  }

  // Batched on purpose: one call for every token on screen, never one per row.
  private async fetchPrices(requests: TokenPriceRequest[]): Promise<TokenPriceMap> {
    const assetPrices = await this.tokenPriceRepository.fetchAssetPrices();
    if (assetPrices.length === 0) {
      return {};
    }

    const pricesByAssetId = TokenPriceService.indexByAssetId(assetPrices);

    return requests.reduce<TokenPriceMap>((prices, request) => {
      const binding = getTokenAssetBinding(request.tokenId, request.networkId);
      if (!binding) {
        return prices;
      }

      const quote = pricesByAssetId.get(binding.assetId);
      if (!quote) {
        return prices;
      }

      const usd = TokenPriceService.toWholeTokenPrice(quote.usd, binding, request.decimals);
      if (usd === null) {
        return prices;
      }

      const price: TokenPrice = {
        tokenId: request.tokenId,
        networkId: request.networkId,
        usd,
        change24h: quote.change24h,
      };
      prices[getTokenPriceKey(request.tokenId, request.networkId)] = price;
      return prices;
    }, {});
  }

  /**
   * The quote restated as the price of one whole token, or null when it cannot
   * be: a binding that names `quoteDecimals` prices an asset in a unit the token
   * may not share, and the shift between the two needs the token's own decimals
   * — which come from its metadata, so the curated value drives this. Reporting
   * nothing beats reporting a figure off by a power of ten.
   */
  private static toWholeTokenPrice(
    usd: number,
    binding: { quoteDecimals?: number },
    tokenDecimals: number | undefined,
  ): number | null {
    const { quoteDecimals } = binding;
    if (quoteDecimals === undefined) {
      return usd;
    }

    if (typeof tokenDecimals !== 'number' || !Number.isFinite(tokenDecimals)) {
      return null;
    }

    return BigNumber(usd)
      .shiftedBy(tokenDecimals - quoteDecimals)
      .toNumber();
  }

  /**
   * One quote per asset, the highest-priority provider winning.
   *
   * The feed appends gnoswap's prices to the market data ones, so the same asset
   * id can appear twice with two different numbers. Choosing by provider keeps
   * the wallet reading the same source every poll, which response order would
   * not.
   */
  private static indexByAssetId(assetPrices: AssetPrice[]): Map<string, AssetPrice> {
    const bestByAssetId = new Map<string, AssetPrice>();

    for (const assetPrice of assetPrices) {
      const current = bestByAssetId.get(assetPrice.assetId);
      if (
        current &&
        getPriceProviderRank(current.provider) <= getPriceProviderRank(assetPrice.provider)
      ) {
        continue;
      }

      bestByAssetId.set(assetPrice.assetId, assetPrice);
    }

    return bestByAssetId;
  }
}

import { AssetPrice, TokenPrice, TokenPriceMap, TokenPriceRequest } from '@types';

import { getTokenAssetId } from '@common/constants/token-price.constant';
import { getTokenPriceKey } from '@common/utils/price-utils';
import { ITokenPriceRepository } from '@repositories/price';

/**
 * Fiat quotes for the tokens the wallet displays.
 *
 * The price API quotes market assets, not chain tokens, so a wallet token is
 * bridged to a quote through the static TOKEN_ASSET_IDS map. A token with no
 * mapping simply has no quote, and its row keeps the balance-only layout.
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
      const assetId = getTokenAssetId(request.tokenId, request.networkId);
      if (!assetId) {
        return prices;
      }

      const quote = pricesByAssetId.get(assetId);
      if (!quote) {
        return prices;
      }

      const price: TokenPrice = {
        tokenId: request.tokenId,
        networkId: request.networkId,
        usd: quote.usd,
        change24h: quote.change24h,
      };
      prices[getTokenPriceKey(request.tokenId, request.networkId)] = price;
      return prices;
    }, {});
  }

  private static indexByAssetId(assetPrices: AssetPrice[]): Map<string, AssetPrice> {
    return new Map(assetPrices.map((assetPrice) => [assetPrice.assetId, assetPrice]));
  }
}

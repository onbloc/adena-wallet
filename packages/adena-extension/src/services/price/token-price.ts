import { TokenPrice, TokenPriceMap, TokenPriceRequest } from '@types';

import { getTokenPriceKey } from '@common/utils/price-utils';
import { MOCK_RESPONSE_DELAY, MOCK_TOKEN_PRICES } from './mock-token-prices';

/**
 * Fiat quotes for the tokens the wallet displays. Currently backed by
 * MOCK_TOKEN_PRICES; only `fetchPrices` changes once the API is ready.
 */
export class TokenPriceService {
  public async getTokenPrices(requests: TokenPriceRequest[]): Promise<TokenPriceMap> {
    if (requests.length === 0) {
      return {};
    }

    return this.fetchPrices(requests);
  }

  // Batched on purpose: one call for every token on screen, never one per row.
  private async fetchPrices(requests: TokenPriceRequest[]): Promise<TokenPriceMap> {
    await new Promise((resolve) => setTimeout(resolve, MOCK_RESPONSE_DELAY));

    return requests.reduce<TokenPriceMap>((prices, request) => {
      const quote = MOCK_TOKEN_PRICES[request.symbol.toUpperCase()];
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
}

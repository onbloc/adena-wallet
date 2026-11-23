import { Network } from '../domain/network';
import { Token, TokenPrice } from '../domain/token';
import { AssetPriceItem, OnblocApiClient } from '../infrastructure/http/onbloc-api.client';
import { PRICE_CONFIG, PriceConfig } from '../resources';

export interface PriceRepository {
  isSupported(network: Network): boolean;
  getPrices(tokens: Token[], network: Network): Promise<TokenPrice[]>;
}

interface Quote {
  provider: string;
  usd: number;
  change24h: number | null;
}

const isUsableQuote = (item: AssetPriceItem, currency: string): boolean => {
  const price = Number(item.price);

  return item.status !== 'unavailable' && item.quoteCurrency === currency && Number.isFinite(price) && price > 0;
};

// USD quotes from the shared price feed, resolved through the bundled price bindings.
export class ApiPriceRepository implements PriceRepository {
  constructor(private readonly api: OnblocApiClient, private readonly config: PriceConfig = PRICE_CONFIG) {}

  isSupported(network: Network): boolean {
    return this.config.pricedNetworkIds.includes(network.id);
  }

  async getPrices(tokens: Token[], network: Network): Promise<TokenPrice[]> {
    if (!this.isSupported(network) || tokens.length === 0) {
      return [];
    }

    const rank = (provider: string): number => {
      const index = this.config.providerPriority.indexOf(provider.toLowerCase());

      return index < 0 ? Number.MAX_SAFE_INTEGER : index;
    };
    const quotes = new Map<string, Quote>();

    for (const item of await this.api.getPrices(this.config.sourceApiUrl)) {
      if (!isUsableQuote(item, this.config.quoteCurrency)) {
        continue;
      }

      const current = quotes.get(item.assetId);

      if (!current || rank(item.provider) < rank(current.provider)) {
        quotes.set(item.assetId, {
          provider: item.provider,
          usd: Number(item.price),
          change24h: typeof item.changeRateOneDay === 'number' && Number.isFinite(item.changeRateOneDay) ? item.changeRateOneDay : null,
        });
      }
    }

    return tokens.flatMap((token) => {
      const binding = this.config.bindings[`${token.id}:${network.id}`] ?? { assetId: token.id };
      const quote = quotes.get(binding.assetId);

      if (!quote) {
        return [];
      }

      const scale = binding.quoteDecimals === undefined ? 1 : 10 ** (token.decimals - binding.quoteDecimals);

      return [{ tokenId: token.id, networkId: network.id, usd: quote.usd * scale, change24h: quote.change24h }];
    });
  }
}

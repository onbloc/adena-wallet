import { ChartRange, MarketLink, TokenMarketData } from '../domain/market';
import { Network } from '../domain/network';
import { Token, tokenPriceKey, TokenType } from '../domain/token';
import { MarketDataRepository } from '../repositories/market-data.repository';
import { tokenExplorerUrl } from '../utils/explorer';
import { PriceService } from './price.service';

export class MarketDataService {
  constructor(private readonly repository: MarketDataRepository, private readonly priceService: PriceService) {}

  async getMarketData(token: Token, network: Network, range: ChartRange): Promise<TokenMarketData> {
    const referencePriceUsd = this.priceService.isSupported(network)
      ? (await this.priceService.getPrices([token], network).catch(() => ({})) as Record<string, { usd: number }>)[tokenPriceKey(token.id, network.id)]?.usd
      : undefined;
    const data = await this.repository.getMarketData({ token, network, range, referencePriceUsd });

    return { ...data, about: data.about ?? token.description, links: [...this.walletLinks(token, network), ...data.links] };
  }

  // Links the wallet can vouch for (explorer, curated website); sources may add more.
  private walletLinks(token: Token, network: Network): MarketLink[] {
    const links: MarketLink[] = [];
    const explorer = token.type === TokenType.GRC20 ? tokenExplorerUrl(network, token.id) : null;

    if (explorer) {
      links.push({ label: 'Gnoscan', url: explorer });
    }

    if (token.websiteUrl?.startsWith('https://')) {
      links.push({ label: 'Website', url: token.websiteUrl });
    }

    return links;
  }
}

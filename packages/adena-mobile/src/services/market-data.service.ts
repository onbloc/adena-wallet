import { ChartRange, MarketLink, TokenMarketData, TokenMarketInfo } from '../domain/market';
import { Network } from '../domain/network';
import { Token, TokenType } from '../domain/token';
import { MarketDataRepository } from '../repositories/market-data.repository';
import { tokenExplorerUrl } from '../utils/explorer';

export class MarketDataService {
  constructor(private readonly repository: MarketDataRepository) {}

  isSupported(network: Network): boolean {
    return this.repository.isSupported(network);
  }

  getMarketData(token: Token, network: Network, range: ChartRange): Promise<TokenMarketData> {
    return this.repository.getMarketData({ token, network, range });
  }

  async getTokenInfo(token: Token, network: Network): Promise<TokenMarketInfo> {
    const info = await this.repository.getTokenInfo({ token, network });
    const links = [...this.walletLinks(token, network), ...info.links];

    // Keep the first link per URL; the wallet's own links win over the source's.
    return {
      ...info,
      about: info.about ?? token.description,
      links: links.filter((link, index) => links.findIndex(other => other.url === link.url) === index),
    };
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

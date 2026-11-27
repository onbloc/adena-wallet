import { Network } from '../domain/network';
import { Token, TokenPrice, tokenPriceKey } from '../domain/token';
import { PriceRepository } from '../repositories/price.repository';
import { formatUSD } from '../utils/price';

export type TokenPriceMap = Record<string, TokenPrice>;

export interface PortfolioValue {
  usd: number;
  // Percent change of the priced part of the portfolio over 24h, when known.
  change24h: number | null;
}

export class PriceService {
  constructor(private readonly priceRepository: PriceRepository) {}

  isSupported(network: Network): boolean {
    return this.priceRepository.isSupported(network);
  }

  async getPrices(tokens: Token[], network: Network): Promise<TokenPriceMap> {
    const prices = await this.priceRepository.getPrices(tokens, network);

    return Object.fromEntries(prices.map(price => [tokenPriceKey(price.tokenId, price.networkId), price]));
  }

  static valueOf(amount: string, token: Token, price?: TokenPrice): number | null {
    if (!price) {
      return null;
    }

    return (Number(amount) / 10 ** token.decimals) * price.usd;
  }

  // "≈ $1.23" for a raw amount, or undefined when the token has no price.
  static fiatLabel(amount: string, token: Token, prices?: TokenPriceMap): string | undefined {
    const usd = PriceService.valueOf(amount, token, prices?.[tokenPriceKey(token.id, token.networkId)]);

    return usd === null ? undefined : `≈ ${formatUSD(usd)}`;
  }

  static portfolio(holdings: { token: Token; amount?: string }[], prices: TokenPriceMap): PortfolioValue | null {
    let total = 0;
    let previous = 0;
    let priced = false;

    for (const { token, amount } of holdings) {
      const price = prices[tokenPriceKey(token.id, token.networkId)];
      const value = amount === undefined ? null : PriceService.valueOf(amount, token, price);

      if (value === null || !price) {
        continue;
      }

      priced = true;
      total += value;
      previous += price.change24h === null ? value : value / (1 + price.change24h / 100);
    }

    if (!priced) {
      return null;
    }

    return { usd: total, change24h: previous > 0 ? ((total - previous) / previous) * 100 : null };
  }
}

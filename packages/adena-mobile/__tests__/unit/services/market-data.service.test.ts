import { ChartRange, TokenMarketData } from '../../../src/domain/market';
import { Network } from '../../../src/domain/network';
import { Token, tokenPriceKey, TokenType } from '../../../src/domain/token';
import { MarketDataRepository } from '../../../src/repositories/market-data.repository';
import { getNativeTokenFor } from '../../../src/resources';
import { MarketDataService } from '../../../src/services/market-data.service';
import { PriceService } from '../../../src/services/price.service';
import { COSMOS_NETWORK, GNO_NETWORK, makeToken } from '../../helpers/service-fakes';

const baseData = (overrides: Partial<TokenMarketData> = {}): TokenMarketData => ({
  tokenId: 't', networkId: 'n', range: ChartRange.ONE_DAY, priceUsd: 1, changePercent: 0, chart: [], stats: {}, links: [], isSample: true, ...overrides,
});

const setup = ({ supported = true, prices = jest.fn(async (): Promise<unknown> => ({})), data = baseData() } = {}) => {
  const repository: MarketDataRepository = { getMarketData: jest.fn(async () => data) };
  const priceService = { isSupported: jest.fn(() => supported), getPrices: prices } as unknown as PriceService;

  return { service: new MarketDataService(repository, priceService), repository, priceService };
};

const requestOf = (repository: MarketDataRepository) => (repository.getMarketData as jest.Mock).mock.calls[0][0];

describe('MarketDataService', () => {
  const grc20 = makeToken();

  it('anchors the series to the live price when one is known', async () => {
    const prices = jest.fn(async () => ({ [tokenPriceKey(grc20.id, GNO_NETWORK.id)]: { usd: 0.42 } }));
    const { service, repository } = setup({ prices });

    await service.getMarketData(grc20, GNO_NETWORK, ChartRange.ONE_WEEK);
    expect(requestOf(repository)).toEqual({ token: grc20, network: GNO_NETWORK, range: ChartRange.ONE_WEEK, referencePriceUsd: 0.42 });
    expect(prices).toHaveBeenCalledWith([grc20], GNO_NETWORK);
  });

  it('has no reference price when the token is unpriced', async () => {
    const { service, repository } = setup();

    await service.getMarketData(grc20, GNO_NETWORK, ChartRange.ONE_DAY);
    expect(requestOf(repository).referencePriceUsd).toBeUndefined();
  });

  it('ignores price feed failures', async () => {
    const { service, repository } = setup({
      prices: jest.fn(async () => {
        throw new Error('feed down');
      }),
    });

    await expect(service.getMarketData(grc20, GNO_NETWORK, ChartRange.ONE_DAY)).resolves.toBeDefined();
    expect(requestOf(repository).referencePriceUsd).toBeUndefined();
  });

  it('skips the price feed on unpriced networks', async () => {
    const { service, repository, priceService } = setup({ supported: false });

    await service.getMarketData(grc20, GNO_NETWORK, ChartRange.ONE_DAY);
    expect(priceService.getPrices).not.toHaveBeenCalled();
    expect(requestOf(repository).referencePriceUsd).toBeUndefined();
  });

  it('prefers the source description and falls back to the token one', async () => {
    const token = makeToken({ description: 'From resources' });

    expect((await setup().service.getMarketData(token, GNO_NETWORK, ChartRange.ONE_DAY)).about).toBe('From resources');
    expect((await setup({ data: baseData({ about: 'From source' }) }).service.getMarketData(token, GNO_NETWORK, ChartRange.ONE_DAY)).about).toBe('From source');
  });

  it('puts wallet links before source links', async () => {
    const token = makeToken({ websiteUrl: 'https://foo.example' });
    const { service } = setup({ data: baseData({ links: [{ label: 'X', url: 'https://x.example' }] }) });
    const { links } = await service.getMarketData(token, GNO_NETWORK, ChartRange.ONE_DAY);

    expect(links.map(link => link.label)).toEqual(['Gnoscan', 'Website', 'X']);
    expect(links[0].url).toContain(encodeURIComponent(GNO_NETWORK.chainId));
  });

  it.each<[string, Token, Network]>([
    ['native coins', getNativeTokenFor(GNO_NETWORK), GNO_NETWORK],
    ['GRC20 tokens on non-Gno networks', makeToken({ type: TokenType.GRC20 }), COSMOS_NETWORK],
    ['non-https websites', makeToken({ type: TokenType.NATIVE, websiteUrl: 'http://insecure.example' }), GNO_NETWORK],
  ])('adds no wallet links for %s', async (_, token, network) => {
    expect((await setup().service.getMarketData(token, network, ChartRange.ONE_DAY)).links).toEqual([]);
  });
});

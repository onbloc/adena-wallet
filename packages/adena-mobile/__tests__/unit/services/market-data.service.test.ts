import { ChartRange, TokenMarketData, TokenMarketInfo } from '../../../src/domain/market';
import { Network } from '../../../src/domain/network';
import { Token, TokenType } from '../../../src/domain/token';
import { MarketDataRepository } from '../../../src/repositories/market-data.repository';
import { getNativeTokenFor } from '../../../src/resources';
import { MarketDataService } from '../../../src/services/market-data.service';
import { COSMOS_NETWORK, GNO_NETWORK, makeToken } from '../../helpers/service-fakes';

const baseInfo = (overrides: Partial<TokenMarketInfo> = {}): TokenMarketInfo => ({ tokenId: 't', networkId: 'n', stats: {}, links: [], ...overrides });

const setup = ({ info = baseInfo(), data = { tokenId: 't', networkId: 'n', range: ChartRange.ONE_DAY, chart: [] } as TokenMarketData } = {}) => {
  const repository: MarketDataRepository = {
    isSupported: jest.fn(() => true),
    getMarketData: jest.fn(async () => data),
    getTokenInfo: jest.fn(async () => info),
  };

  return { service: new MarketDataService(repository), repository };
};

describe('MarketDataService', () => {
  const grc20 = makeToken();

  it('passes chart requests through to the repository', async () => {
    const { service, repository } = setup();

    await service.getMarketData(grc20, GNO_NETWORK, ChartRange.ONE_WEEK);
    expect(repository.getMarketData).toHaveBeenCalledWith({ token: grc20, network: GNO_NETWORK, range: ChartRange.ONE_WEEK });
    expect(service.isSupported(GNO_NETWORK)).toBe(true);
  });

  it('prefers the source description and falls back to the token one', async () => {
    const token = makeToken({ description: 'From resources' });

    expect((await setup().service.getTokenInfo(token, GNO_NETWORK)).about).toBe('From resources');
    expect((await setup({ info: baseInfo({ about: 'From source' }) }).service.getTokenInfo(token, GNO_NETWORK)).about).toBe('From source');
  });

  it('puts wallet links before source links', async () => {
    const token = makeToken({ websiteUrl: 'https://foo.example' });
    const { service } = setup({ info: baseInfo({ links: [{ label: 'X', url: 'https://x.example' }, { label: 'Home', url: 'https://foo.example' }] }) });
    const { links } = await service.getTokenInfo(token, GNO_NETWORK);

    // The source's duplicate of the curated website is dropped.
    expect(links.map(link => link.label)).toEqual(['Gnoscan', 'Website', 'X']);
    expect(links[0].url).toContain(encodeURIComponent(GNO_NETWORK.chainId));
  });

  it.each<[string, Token, Network]>([
    ['native coins', getNativeTokenFor(GNO_NETWORK), GNO_NETWORK],
    ['GRC20 tokens on non-Gno networks', makeToken({ type: TokenType.GRC20 }), COSMOS_NETWORK],
    ['non-https websites', makeToken({ type: TokenType.NATIVE, websiteUrl: 'http://insecure.example' }), GNO_NETWORK],
  ])('adds no wallet links for %s', async (_, token, network) => {
    expect((await setup().service.getTokenInfo(token, network)).links).toEqual([]);
  });
});

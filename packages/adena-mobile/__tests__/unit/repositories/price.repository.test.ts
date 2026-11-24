import { Network } from '../../../src/domain/network';
import { Token } from '../../../src/domain/token';
import { AssetPriceItem, OnblocApiClient } from '../../../src/infrastructure/http/onbloc-api.client';
import { ApiPriceRepository } from '../../../src/repositories/price.repository';
import { PRICE_CONFIG, PriceConfig } from '../../../src/resources';

const CONFIG: PriceConfig = {
  sourceApiUrl: 'https://prices.test',
  quoteCurrency: 'USD',
  providerPriority: ['cmc', 'gnoswap'],
  pricedNetworkIds: ['main'],
  bindings: {
    'ugnot:main': { assetId: 'gno-land' },
    'wugnot:main': { assetId: 'gno-land', quoteDecimals: 6 },
    'big:main': { assetId: 'big', quoteDecimals: 4 },
  },
};

const network = (id: string): Network => ({ id } as Network);
const token = (id: string, decimals = 6): Token => ({ id, decimals } as Token);
const quote = (assetId: string, price: string, extra: Partial<AssetPriceItem> = {}): AssetPriceItem => ({
  assetId, price, provider: 'cmc', quoteCurrency: 'USD', status: 'ok', changeRateOneDay: 1.5, ...extra,
});

const setup = (items: AssetPriceItem[], config: PriceConfig = CONFIG) => {
  const getPrices = jest.fn(async () => items);
  const repository = new ApiPriceRepository({ getPrices } as unknown as OnblocApiClient, config);

  return { repository, getPrices };
};

describe('ApiPriceRepository', () => {
  it('uses the bundled config by default', () => {
    const repository = new ApiPriceRepository({} as OnblocApiClient);

    PRICE_CONFIG.pricedNetworkIds.forEach(id => expect(repository.isSupported(network(id))).toBe(true));
    expect(repository.isSupported(network('unknown'))).toBe(false);
  });

  it('skips the API for unsupported networks or empty token lists', async () => {
    const { repository, getPrices } = setup([quote('gno-land', '1')]);

    await expect(repository.getPrices([token('ugnot')], network('test'))).resolves.toEqual([]);
    await expect(repository.getPrices([], network('main'))).resolves.toEqual([]);
    expect(getPrices).not.toHaveBeenCalled();
  });

  it('resolves bindings, falls back to the token id and skips unpriced tokens', async () => {
    const { repository, getPrices } = setup([quote('gno-land', '2'), quote('custom', '0.5', { changeRateOneDay: null })]);
    const prices = await repository.getPrices([token('ugnot'), token('custom'), token('none')], network('main'));

    expect(getPrices).toHaveBeenCalledWith('https://prices.test');
    expect(prices).toEqual([
      { tokenId: 'ugnot', networkId: 'main', usd: 2, change24h: 1.5 },
      { tokenId: 'custom', networkId: 'main', usd: 0.5, change24h: null },
    ]);
  });

  it('scales by quoteDecimals relative to token decimals', async () => {
    const { repository } = setup([quote('gno-land', '2'), quote('big', '3')]);
    const prices = await repository.getPrices([token('wugnot', 6), token('big', 6)], network('main'));

    expect(prices.map(price => price.usd)).toEqual([2, 300]);
  });

  it.each([
    ['unavailable status', { status: 'unavailable' }],
    ['other currency', { quoteCurrency: 'EUR' }],
    ['zero price', { price: '0' }],
    ['negative price', { price: '-1' }],
    ['non-numeric price', { price: 'abc' }],
    ['infinite price', { price: 'Infinity' }],
  ])('ignores quotes with %s', async (_label, extra) => {
    const { repository } = setup([quote('gno-land', '1', extra as Partial<AssetPriceItem>)]);

    await expect(repository.getPrices([token('ugnot')], network('main'))).resolves.toEqual([]);
  });

  it('keeps the highest-priority provider regardless of order or case', async () => {
    const { repository } = setup([
      quote('gno-land', '9', { provider: 'unknown' }),
      quote('gno-land', '3', { provider: 'GnoSwap' }),
      quote('gno-land', '1', { provider: 'CMC' }),
      quote('gno-land', '5', { provider: 'gnoswap' }),
      quote('gno-land', '7', { provider: 'other' }),
    ]);

    await expect(repository.getPrices([token('ugnot')], network('main'))).resolves.toEqual([
      { tokenId: 'ugnot', networkId: 'main', usd: 1, change24h: 1.5 },
    ]);
  });

  it('keeps the first of two unranked providers', async () => {
    const { repository } = setup([quote('gno-land', '9', { provider: 'x' }), quote('gno-land', '8', { provider: 'y' })]);

    await expect(repository.getPrices([token('ugnot')], network('main'))).resolves.toMatchObject([{ usd: 9 }]);
  });

  it.each([NaN, Infinity, '2' as unknown as number])('drops non-finite change rate %p', async (change) => {
    const { repository } = setup([quote('gno-land', '1', { changeRateOneDay: change })]);

    await expect(repository.getPrices([token('ugnot')], network('main'))).resolves.toMatchObject([{ change24h: null }]);
  });

  it('propagates API failures', async () => {
    const repository = new ApiPriceRepository({
      getPrices: async () => {
        throw new Error('down');
      },
    } as unknown as OnblocApiClient, CONFIG);

    await expect(repository.getPrices([token('ugnot')], network('main'))).rejects.toThrow('down');
  });
});

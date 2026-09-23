import { AssetPricesResponse } from '../response/asset-price-response';
import { AssetPriceMapper } from './asset-price-mapper';

function makeItem(
  overrides: Partial<AssetPricesResponse['items'][0]> = {},
): AssetPricesResponse['items'][0] {
  return {
    assetId: 'gno-land',
    name: 'Gno.land',
    symbol: 'GNOT',
    providerAssetId: 40890,
    quoteCurrency: 'USD',
    provider: 'CMC',
    price: '1.2500',
    status: 'fresh',
    priceAt: '2026-09-22T12:00:00.123456Z',
    oneDayAgoPrice: '1.0000',
    oneDayAgoPriceAt: '2026-09-21T12:00:00.5Z',
    changeRateOneDay: 25,
    ...overrides,
  };
}

describe('AssetPriceMapper', () => {
  it('maps a quote, keeping the decimal price exact', () => {
    expect(AssetPriceMapper.fromResponse({ items: [makeItem({ price: '0.086' })] })).toEqual([
      { assetId: 'gno-land', usd: 0.086, change24h: 25 },
    ]);
  });

  it('keeps a stale quote: it is the last price the feed actually saw', () => {
    const prices = AssetPriceMapper.fromResponse({ items: [makeItem({ status: 'stale' })] });

    expect(prices).toHaveLength(1);
    expect(prices[0].usd).toBe(1.25);
  });

  it('drops an asset the feed has not priced yet', () => {
    expect(
      AssetPriceMapper.fromResponse({
        items: [makeItem({ status: 'unavailable', price: '', changeRateOneDay: null })],
      }),
    ).toEqual([]);
  });

  it('drops an unparseable, zero or negative price rather than reading it as $0', () => {
    expect(AssetPriceMapper.fromResponse({ items: [makeItem({ price: 'n/a' })] })).toEqual([]);
    expect(AssetPriceMapper.fromResponse({ items: [makeItem({ price: '-1' })] })).toEqual([]);
    expect(AssetPriceMapper.fromResponse({ items: [makeItem({ price: '0' })] })).toEqual([]);
    expect(AssetPriceMapper.fromResponse({ items: [makeItem({ price: '0.0000' })] })).toEqual([]);
  });

  it('drops a quote denominated in anything but USD', () => {
    expect(AssetPriceMapper.fromResponse({ items: [makeItem({ quoteCurrency: 'KRW' })] })).toEqual(
      [],
    );
  });

  it('keeps a missing 24h rate null instead of flattening it to 0%', () => {
    const prices = AssetPriceMapper.fromResponse({
      items: [makeItem({ oneDayAgoPrice: null, oneDayAgoPriceAt: null, changeRateOneDay: null })],
    });

    expect(prices[0].change24h).toBeNull();
  });

  it('tolerates a missing or malformed payload', () => {
    expect(AssetPriceMapper.fromResponse(null)).toEqual([]);
    expect(AssetPriceMapper.fromResponse(undefined)).toEqual([]);
    expect(AssetPriceMapper.fromResponse({} as AssetPricesResponse)).toEqual([]);
  });
});

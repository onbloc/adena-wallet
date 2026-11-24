import { ChainFamily } from '../../../src/domain/network';
import { isUnknownToken, ManagedToken, Token, TokenPrice, TokenSource, TokenType } from '../../../src/domain/token';
import { AssetView, buildAssetViews, filterPortfolioAssets, sortAssets, toAssetItem, toAssetView } from '../../../src/presenters/asset.presenter';
import { Trend } from '../../../src/utils/price';

const token = (overrides: Partial<Token> = {}): Token => ({
  id: 'ugnot',
  networkId: 'n1',
  family: ChainFamily.GNO,
  type: TokenType.NATIVE,
  name: 'Gno.land',
  symbol: 'GNOT',
  decimals: 6,
  isNative: true,
  ...overrides,
});

const price = (usd: number, change24h: number | null = 0): TokenPrice => ({ tokenId: 'ugnot', networkId: 'n1', usd, change24h });

describe('toAssetView', () => {
  it('formats quantity, value and change', () => {
    expect(toAssetView(token({ localIcon: 'gnot' }), '2500000', price(2, 3.456), false)).toEqual({
      token: token({ localIcon: 'gnot' }),
      amount: '2500000',
      quantityLabel: '2.5 GNOT',
      valueLabel: '$5.00',
      changeLabel: '+3.45%',
      trend: Trend.POSITIVE,
      usdValue: 5,
      loading: false,
      valueLoading: false,
    });
  });

  it('leaves labels empty while the amount is unknown', () => {
    const view = toAssetView(token(), undefined, price(2, -5), true);

    expect(view.quantityLabel).toBeUndefined();
    expect(view.valueLabel).toBeUndefined();
    expect(view.usdValue).toBeNull();
    expect(view.changeLabel).toBe('-5.00%');
    expect(view.trend).toBe(Trend.NEGATIVE);
    expect(view.loading).toBe(true);
  });

  it('omits value and change without a price', () => {
    const view = toAssetView(token(), '1', undefined, false);

    expect(view.quantityLabel).toBe('0.000001 GNOT');
    expect(view.valueLabel).toBeUndefined();
    expect(view.changeLabel).toBeUndefined();
    expect(view.trend).toBe(Trend.NEUTRAL);
  });

  it('omits the change when change24h is null', () => {
    const view = toAssetView(token(), '0', price(1, null), false);

    expect(view.changeLabel).toBeUndefined();
    expect(view.valueLabel).toBe('$0.00');
  });
});

describe('sortAssets', () => {
  const view = (symbol: string, isNative: boolean, usdValue: number | null): AssetView =>
    ({ token: token({ id: symbol, symbol, isNative }), trend: Trend.NEUTRAL, usdValue, loading: false, valueLoading: false });

  it('puts native first, then by value desc, then by symbol', () => {
    const input = [view('B', false, 1), view('A', false, 1), view('C', false, 10), view('Z', false, null), view('N', true, 0)];
    const sorted = sortAssets(input);

    expect(sorted.map(item => item.token.symbol)).toEqual(['N', 'C', 'A', 'B', 'Z']);
    expect(sorted).not.toBe(input);
    expect(input[0].token.symbol).toBe('B');
  });

  it('ranks a zero value above an unknown value', () => {
    expect(sortAssets([view('A', false, null), view('B', false, 0)]).map(item => item.token.symbol)).toEqual(['B', 'A']);
  });

  it('puts native first regardless of input order', () => {
    expect(sortAssets([view('N', true, null), view('A', false, 100)]).map(item => item.token.symbol)).toEqual(['N', 'A']);
    expect(sortAssets([view('A', false, 100), view('N', true, null)]).map(item => item.token.symbol)).toEqual(['N', 'A']);
  });

  it('sorts empty lists', () => {
    expect(sortAssets([])).toEqual([]);
  });
});

describe('buildAssetViews', () => {
  const foo = token({ id: 'foo', symbol: 'FOO', type: TokenType.GRC20, isNative: false, decimals: 0 });

  it('joins balances and prices per token', () => {
    const views = buildAssetViews([foo, token()], { ugnot: '1000000', foo: '3' }, { 'ugnot:n1': price(1), 'foo:n1': price(10, 1) }, true);

    expect(views.map(item => [item.token.id, item.usdValue, item.loading])).toEqual([['ugnot', 1, false], ['foo', 30, false]]);
  });

  it('marks views as loading only while balances are missing', () => {
    const views = buildAssetViews([token()], undefined, undefined, true);

    expect(views[0].loading).toBe(true);
    expect(views[0].amount).toBeUndefined();
    expect(buildAssetViews([token()], undefined, undefined, false)[0].loading).toBe(false);
  });

  it('loads a token missing from placeholder balances on its own', () => {
    const views = buildAssetViews([foo, token()], { ugnot: '1000000' }, undefined, true);

    expect(views.map(item => [item.token.id, item.loading])).toEqual([['ugnot', false], ['foo', true]]);
  });

  it('marks only the value cell as loading while prices are expected', () => {
    const [pending] = buildAssetViews([token()], { ugnot: '1000000' }, undefined, false, true);
    const [priced] = buildAssetViews([token()], { ugnot: '1000000' }, { 'ugnot:n1': price(1) }, false, true);

    expect(pending).toMatchObject({ loading: false, valueLoading: true, quantityLabel: '1 GNOT' });
    expect(priced.valueLoading).toBe(false);
  });

  it('returns nothing for no tokens', () => {
    expect(buildAssetViews([], {}, {}, false)).toEqual([]);
  });
});

describe('toAssetItem', () => {
  it('maps a view to the list item', () => {
    const view = toAssetView(token({ imageUrl: 'https://x/i.png', localIcon: 'gnot' }), '1000000', price(1, 1), false);

    expect(toAssetItem(view)).toEqual({
      key: 'ugnot',
      symbol: 'GNOT',
      name: 'Gno.land',
      localIcon: 'gnot',
      imageUrl: 'https://x/i.png',
      quantity: '1 GNOT',
      value: '$1.00',
      change: '+1.00%',
      trend: Trend.POSITIVE,
      loading: false,
      valueLoading: false,
    });
  });
});

describe('filterPortfolioAssets', () => {
  const managed = (id: string, source: TokenSource, extra: Partial<ManagedToken> = {}): ManagedToken => ({
    ...token({ id, symbol: id.toUpperCase(), type: TokenType.GRC20, isNative: false }),
    visible: true,
    source,
    ...extra,
  });
  const native = { ...token(), visible: true, source: TokenSource.DEFAULT };
  const listedSmall = managed('listed-small', TokenSource.DISCOVERED, { listed: true });
  const listedBig = managed('listed-big', TokenSource.DISCOVERED, { listed: true });
  const unpriced = managed('unpriced', TokenSource.DISCOVERED, { listed: true });
  const unknown = managed('unknown', TokenSource.DISCOVERED);
  const customSmall = managed('custom-small', TokenSource.CUSTOM);
  const tokens = [native, listedSmall, listedBig, unpriced, unknown, customSmall];
  const views: AssetView[] = [
    toAssetView(native, '1', price(0.1), false),
    toAssetView(listedSmall, '1000000', price(0.5), false),
    toAssetView(listedBig, '1000000', price(2), false),
    toAssetView(unpriced, '1000000', undefined, false),
    toAssetView(unknown, '1000000', price(5), false),
    toAssetView(customSmall, '1', price(0.1), false),
  ];
  const ids = (list: AssetView[]): string[] => list.map(view => view.token.id);

  it('treats only discovered tokens outside the curated resources as unknown', () => {
    expect(tokens.filter(isUnknownToken).map(item => item.id)).toEqual(['unknown']);
  });

  it('keeps everything with both filters off', () => {
    expect(ids(filterPortfolioAssets(views, tokens, { hideSmallBalances: false, hideUnknownTokens: false }))).toEqual(ids(views));
  });

  it('hides priced balances under 1 USD but never the native coin, user-added or unpriced tokens', () => {
    expect(ids(filterPortfolioAssets(views, tokens, { hideSmallBalances: true, hideUnknownTokens: false })))
      .toEqual(['ugnot', 'listed-big', 'unpriced', 'unknown', 'custom-small']);
  });

  it('hides unknown tokens regardless of value', () => {
    expect(ids(filterPortfolioAssets(views, tokens, { hideSmallBalances: false, hideUnknownTokens: true })))
      .toEqual(['ugnot', 'listed-small', 'listed-big', 'unpriced', 'custom-small']);
  });

  it('applies both filters together', () => {
    expect(ids(filterPortfolioAssets(views, tokens, { hideSmallBalances: true, hideUnknownTokens: true })))
      .toEqual(['ugnot', 'listed-big', 'unpriced', 'custom-small']);
  });
});

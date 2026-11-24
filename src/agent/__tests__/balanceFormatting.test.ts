import { formatBalance, type BalanceAsset, type BalanceResult } from '..';

const holding: BalanceAsset = {
  kind: 'token', assetId: 'gno.land/r/xgns', symbol: 'xGNS', amount: '17528000000', decimals: 6,
};
const portfolio: BalanceResult = {
  account: 'g1axehvc90taqzngkg8amdfw7q6lfyjekfkc4n7v',
  chainId: 'gnoland-1',
  request: { kind: 'all' },
  status: 'complete',
  assets: [holding],
  missing: [],
};

it('renders exact units and token identity without floating point', () => {
  expect(formatBalance(portfolio)).toBe('Token balances:\n- 17528 xGNS (gno.land/r/xgns)');
  expect(formatBalance({
    ...portfolio, assets: [{ ...holding, amount: '9007199254740993' }],
  })).toContain('9007199254.740993 xGNS');
});

it('rejects invalid units rather than echoing unverified balances', () => {
  expect(() => formatBalance({ ...portfolio, assets: [{ ...holding, amount: '-10' }] })).toThrow();
});

it('shows which source is unavailable for a partial portfolio', () => {
  expect(formatBalance({
    ...portfolio,
    status: 'partial',
    assets: [{ kind: 'native', assetId: 'ugnot', symbol: 'GNOT', amount: '10000000', decimals: 6 }],
    missing: ['tokens'],
  })).toBe('10 GNOT\n\nCould not verify: token balances.');
});

it('identifies each candidate when a symbol is ambiguous', () => {
  expect(formatBalance({
    ...portfolio,
    request: { kind: 'one', asset: { kind: 'symbol', value: 'xGNS' } },
    status: 'ambiguous',
    assets: [holding, { ...holding, assetId: 'gno.land/r/other/xgns' }],
  })).toBe(
    'Multiple assets match xGNS. Choose an asset ID:\n' +
    '- 17528 xGNS (gno.land/r/xgns)\n' +
    '- 17528 xGNS (gno.land/r/other/xgns)'
  );
});

import { formatOnblocBalance } from '../onblocBalances';

const holding = { amount: '17528000000', decimals: 6, symbol: 'xGNS', tokenId: 'gno.land/r/xgns' };
const format = (item: unknown) => formatOnblocBalance('get_token_balances', { kind: 'result', value: { untrustedData: { items: [item] } } });

it('renders exact GRC20 units and token identity without floating point', () => {
  expect(format(holding)).toBe('GRC20 balances:\n- 17528 xGNS (gno.land/r/xgns)');
  expect(format({ ...holding, amount: '9007199254740993' })).toContain('9007199254.740993 xGNS');
});

it('rejects invalid units rather than echoing unverified balances', () => {
  expect(format({ ...holding, amount: '-10' })).toBeUndefined();
});

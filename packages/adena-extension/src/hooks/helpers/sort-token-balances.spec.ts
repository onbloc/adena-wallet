import { TokenBalanceType } from '@types';

import { compareTokenBalances } from './sort-token-balances';

function makeToken(overrides: Partial<TokenBalanceType> & { symbol: string }): TokenBalanceType {
  const { symbol, ...rest } = overrides;
  return {
    main: false,
    tokenId: symbol,
    networkId: 'test',
    display: true,
    type: 'grc20',
    name: symbol,
    decimals: 6,
    image: '',
    amount: { value: '0', denom: symbol },
    symbol,
    ...rest,
  } as TokenBalanceType;
}

describe('compareTokenBalances', () => {
  it('pins the native (main) token at the top', () => {
    const gnot = makeToken({ symbol: 'GNOT', main: true, amount: { value: '1', denom: 'GNOT' } });
    const atom = makeToken({ symbol: 'ATOM', amount: { value: '1000', denom: 'ATOM' } });

    const sorted = [atom, gnot].sort(compareTokenBalances);

    expect(sorted[0].symbol).toBe('GNOT');
    expect(sorted[1].symbol).toBe('ATOM');
  });

  it('orders non-main tokens by amount descending', () => {
    const atom = makeToken({ symbol: 'ATOM', amount: { value: '12', denom: 'ATOM' } });
    const photon = makeToken({ symbol: 'PHOTON', amount: { value: '100', denom: 'PHOTON' } });

    const sorted = [atom, photon].sort(compareTokenBalances);

    expect(sorted.map((t) => t.symbol)).toEqual(['PHOTON', 'ATOM']);
  });

  it('falls back to symbol ascending when amounts are equal', () => {
    const a = makeToken({ symbol: 'BBB', amount: { value: '10', denom: 'BBB' } });
    const b = makeToken({ symbol: 'AAA', amount: { value: '10', denom: 'AAA' } });

    const sorted = [a, b].sort(compareTokenBalances);

    expect(sorted.map((t) => t.symbol)).toEqual(['AAA', 'BBB']);
  });

  it('places tokens with missing or invalid amounts last', () => {
    const valid = makeToken({ symbol: 'ATOM', amount: { value: '5', denom: 'ATOM' } });
    const empty = makeToken({ symbol: 'EMPTY', amount: { value: '', denom: '' } });
    const nan = makeToken({ symbol: 'NAN', amount: { value: 'not-a-number', denom: 'NAN' } });

    const sorted = [empty, valid, nan].sort(compareTokenBalances);

    expect(sorted[0].symbol).toBe('ATOM');
    expect(sorted.slice(1).map((t) => t.symbol).sort()).toEqual(['EMPTY', 'NAN']);
  });

  it('keeps GNOT first even when other tokens have a larger amount', () => {
    const gnot = makeToken({ symbol: 'GNOT', main: true, amount: { value: '1', denom: 'GNOT' } });
    const photon = makeToken({ symbol: 'PHOTON', amount: { value: '999999', denom: 'PHOTON' } });
    const atom = makeToken({ symbol: 'ATOM', amount: { value: '12', denom: 'ATOM' } });

    const sorted = [photon, atom, gnot].sort(compareTokenBalances);

    expect(sorted.map((t) => t.symbol)).toEqual(['GNOT', 'PHOTON', 'ATOM']);
  });
});

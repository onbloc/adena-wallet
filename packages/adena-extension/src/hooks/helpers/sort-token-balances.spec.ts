import { TokenBalanceType } from '@types';

import { compareTokenBalances, sortTokenBalancesByStoredOrder } from './sort-token-balances';

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
    expect(
      sorted
        .slice(1)
        .map((t) => t.symbol)
        .sort(),
    ).toEqual(['EMPTY', 'NAN']);
  });

  it('keeps GNOT first even when other tokens have a larger amount', () => {
    const gnot = makeToken({ symbol: 'GNOT', main: true, amount: { value: '1', denom: 'GNOT' } });
    const photon = makeToken({ symbol: 'PHOTON', amount: { value: '999999', denom: 'PHOTON' } });
    const atom = makeToken({ symbol: 'ATOM', amount: { value: '12', denom: 'ATOM' } });

    const sorted = [photon, atom, gnot].sort(compareTokenBalances);

    expect(sorted.map((t) => t.symbol)).toEqual(['GNOT', 'PHOTON', 'ATOM']);
  });
});

describe('sortTokenBalancesByStoredOrder', () => {
  it('replays the stored order', () => {
    const gnot = makeToken({ symbol: 'GNOT', main: true });
    const atom = makeToken({ symbol: 'ATOM' });
    const photon = makeToken({ symbol: 'PHOTON' });

    const sorted = sortTokenBalancesByStoredOrder(
      [photon, gnot, atom],
      ['GNOT:test', 'PHOTON:test', 'ATOM:test'],
    );

    expect(sorted.map((t) => t.symbol)).toEqual(['GNOT', 'PHOTON', 'ATOM']);
  });

  it('holds the stored order while amounts are still arriving', () => {
    const gnot = makeToken({ symbol: 'GNOT', main: true, amount: { value: '', denom: '' } });
    const atom = makeToken({ symbol: 'ATOM', amount: { value: '1', denom: 'ATOM' } });
    const photon = makeToken({ symbol: 'PHOTON', amount: { value: '', denom: '' } });
    const order = ['GNOT:test', 'PHOTON:test', 'ATOM:test'];

    // ATOM resolving first must not lift it above the rows still loading.
    expect(
      sortTokenBalancesByStoredOrder([gnot, atom, photon], order).map((t) => t.symbol),
    ).toEqual(['GNOT', 'PHOTON', 'ATOM']);
  });

  it('appends tokens the stored order does not know, ordered by balance', () => {
    const gnot = makeToken({ symbol: 'GNOT', main: true });
    const atom = makeToken({ symbol: 'ATOM' });
    const fresh = makeToken({ symbol: 'FRESH', amount: { value: '5', denom: 'FRESH' } });
    const fresher = makeToken({ symbol: 'FRESHER', amount: { value: '50', denom: 'FRESHER' } });

    const sorted = sortTokenBalancesByStoredOrder(
      [fresh, gnot, fresher, atom],
      ['GNOT:test', 'ATOM:test'],
    );

    expect(sorted.map((t) => t.symbol)).toEqual(['GNOT', 'ATOM', 'FRESHER', 'FRESH']);
  });

  it('pins the native token even when the stored order buried it', () => {
    const gnot = makeToken({ symbol: 'GNOT', main: true });
    const atom = makeToken({ symbol: 'ATOM' });

    const sorted = sortTokenBalancesByStoredOrder([gnot, atom], ['ATOM:test', 'GNOT:test']);

    expect(sorted.map((t) => t.symbol)).toEqual(['GNOT', 'ATOM']);
  });

  it('keys rows by network so the same token id on two chains stays distinct', () => {
    const mainnet = makeToken({ symbol: 'ATONE', tokenId: 'uatone', networkId: 'atomone-1' });
    const testnet = makeToken({ symbol: 'ATONE', tokenId: 'uatone', networkId: 'atomone-test' });

    const sorted = sortTokenBalancesByStoredOrder(
      [mainnet, testnet],
      ['uatone:atomone-test', 'uatone:atomone-1'],
    );

    expect(sorted.map((t) => t.networkId)).toEqual(['atomone-test', 'atomone-1']);
  });

  it('falls back to balance order when nothing is stored', () => {
    const atom = makeToken({ symbol: 'ATOM', amount: { value: '1', denom: 'ATOM' } });
    const photon = makeToken({ symbol: 'PHOTON', amount: { value: '100', denom: 'PHOTON' } });

    const sorted = sortTokenBalancesByStoredOrder([atom, photon], []);

    expect(sorted.map((t) => t.symbol)).toEqual(['PHOTON', 'ATOM']);
  });
});

import { TokenBalanceType, TokenPriceMap } from '@types';
import { getPortfolioBalanceState } from './portfolio-balance-state';

function row(tokenId: string, networkId: string): TokenBalanceType {
  return { tokenId, networkId } as TokenBalanceType;
}

const GNOT = row('ugnot', 'gnoland-1');
const ATONE = row('atomone-1:uatone', 'atomone-1');

const PRICES: TokenPriceMap = {
  'ugnot:gnoland-1': { tokenId: 'ugnot', networkId: 'gnoland-1', usd: 2, change24h: null },
  'atomone-1:uatone:atomone-1': {
    tokenId: 'atomone-1:uatone',
    networkId: 'atomone-1',
    usd: 4,
    change24h: null,
  },
};

describe('getPortfolioBalanceState', () => {
  it('is settled when every priced holding has a balance', () => {
    expect(getPortfolioBalanceState([GNOT, ATONE], PRICES, new Set(), new Set())).toEqual({
      unavailable: false,
      incomplete: false,
    });
  });

  it('is incomplete while a priced holding on another chain is still loading', () => {
    // Gno landed, AtomOne has not: summing here would show half the portfolio
    // as the total and then climb when the rest arrives.
    const state = getPortfolioBalanceState(
      [GNOT, ATONE],
      PRICES,
      new Set(),
      new Set(['atomone-1:uatone:atomone-1']),
    );

    expect(state).toEqual({ unavailable: false, incomplete: true });
  });

  it('is unavailable when a priced holding could not be refreshed', () => {
    const state = getPortfolioBalanceState(
      [GNOT, ATONE],
      PRICES,
      new Set(['gnoland-1']),
      new Set(),
    );

    expect(state).toEqual({ unavailable: true, incomplete: false });
  });

  it('ignores an unquoted holding, which cannot change the sum either way', () => {
    const unquoted = row('gno.land/r/demo/foo', 'gnoland-1');

    const state = getPortfolioBalanceState(
      [GNOT, unquoted],
      { 'ugnot:gnoland-1': PRICES['ugnot:gnoland-1'] },
      new Set(),
      new Set(['gno.land/r/demo/foo:gnoland-1']),
    );

    expect(state).toEqual({ unavailable: false, incomplete: false });
  });

  it('reports both when one priced holding failed and another is still loading', () => {
    const state = getPortfolioBalanceState(
      [GNOT, ATONE],
      PRICES,
      new Set(['gnoland-1']),
      new Set(['atomone-1:uatone:atomone-1']),
    );

    expect(state).toEqual({ unavailable: true, incomplete: true });
  });
});

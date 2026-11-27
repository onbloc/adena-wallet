import { TransactionType } from '../../../agent';
import { TokenSymbol } from '../../wallet/tokens';
import { describeTransaction } from '../describeTransaction';

describe('describeTransaction', () => {
  it('shows every field of a prepared transfer', () => {
    const description = describeTransaction({
      type: TransactionType.Transfer,
      chainId: 'gnoland-1',
      from: 'g1from',
      to: 'g1to',
      amount: '0.5',
      token: TokenSymbol.Gnot,
    });

    expect(description.title).toBe('Transfer prepared');
    expect(Object.fromEntries(description.rows)).toEqual({
      From: 'g1from',
      To: 'g1to',
      Amount: '0.5 GNOT',
      Chain: 'gnoland-1',
    });
  });

  it('shows every field of a prepared token approval', () => {
    const description = describeTransaction({
      type: TransactionType.Allowance,
      chainId: 'gnoland-1',
      from: 'g1owner',
      spender: 'g1spender',
      amount: '10',
      token: TokenSymbol.Gns,
      packagePath: 'gno.land/r/alternate/gns',
    });

    expect(description.title).toBe('Approval prepared');
    expect(Object.fromEntries(description.rows)).toEqual({
      Owner: 'g1owner',
      Spender: 'g1spender',
      Amount: '10 GNS',
      'Token realm': 'gno.land/r/alternate/gns',
      Chain: 'gnoland-1',
    });
  });
});

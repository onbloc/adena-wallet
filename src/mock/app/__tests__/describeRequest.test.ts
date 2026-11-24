import { SignRequestType, TokenSymbol } from '../../../agent';
import { describeRequest } from '../describeRequest';

describe('describeRequest', () => {
  it('shows every field of a transfer the user is about to sign', () => {
    const summary = describeRequest({
      type: SignRequestType.Transfer,
      chainId: 'gnoland-1',
      from: 'g1from',
      to: 'g1to',
      amount: '0.5',
      token: TokenSymbol.Gnot,
      nonce: 3,
    });

    expect(summary.title).toBe('Sign transfer');
    expect(Object.fromEntries(summary.rows)).toEqual({
      From: 'g1from',
      To: 'g1to',
      Amount: '0.5 GNOT',
      Chain: 'gnoland-1',
      Nonce: '3',
    });
  });

  it('shows every field of a token approval the user is about to sign', () => {
    const summary = describeRequest({
      type: SignRequestType.Allowance,
      chainId: 'gnoland-1',
      from: 'g1owner',
      spender: 'g1spender',
      amount: '10',
      token: TokenSymbol.Gns,
      nonce: 1,
    });

    expect(summary.title).toBe('Sign approval');
    expect(Object.fromEntries(summary.rows)).toEqual({
      Owner: 'g1owner',
      Spender: 'g1spender',
      Amount: '10 GNS',
      Chain: 'gnoland-1',
      Nonce: '1',
    });
  });

  it('shows the signer and the exact text of a message', () => {
    const summary = describeRequest({
      type: SignRequestType.Message,
      signer: 'g1me',
      text: 'hello',
    });

    expect(summary.title).toBe('Sign message');
    expect(Object.fromEntries(summary.rows)).toEqual({ Signer: 'g1me', Message: 'hello' });
  });
});

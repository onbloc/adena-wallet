import { decodeTransactionMessage } from '@adena-wallet/sdk';

import { TransactionType, WalletErrorCode } from '../../agent';
import { AdenaWalletSdk, type AdenaTransaction } from '../adenaWalletSdk';
import { pickToken, type TokenResolver } from '../tokens';

const sender = 'g1axehvc90taqzngkg8amdfw7q6lfyjekfkc4n7v';
const other = 'g1l7aum6echk45nj3s0wdvt2fg8x9yrzpql7aum6';
const spender = 'g1tvdw0s3jn54khce6mua7lqpzry9x8gf2tvdw0s';
const gns = { packagePath: 'gno.land/r/gnoswap/gns', symbol: 'GNS', amount: '63607', decimals: 6 };

function makeSdk(chainId?: string) {
  const lookups: [string, string][] = [];
  const tokens: TokenResolver = async (query, owner) => {
    lookups.push([query, owner]);
    return pickToken(query, [gns]);
  };
  return { sdk: new AdenaWalletSdk({ tokens, chainId }), lookups };
}

const send = (amount: string, token = 'GNOT') => ({ from: sender, to: other, amount, token });
/** The first message of the transaction, decoded from its protobuf form. */
const firstMessage = (tx: unknown) =>
  decodeTransactionMessage((tx as AdenaTransaction).messages[0]);

describe('transfer', () => {
  it('builds an unsigned bank send for GNOT and summarizes it', async () => {
    const { sdk } = makeSdk();

    const { summary, tx } = await sdk.transfer(send('1.5', ' gnot '));

    expect(summary).toEqual({
      type: TransactionType.Transfer,
      chainId: 'gnoland-1',
      from: sender,
      to: other,
      amount: '1.5',
      token: 'GNOT',
    });
    expect(firstMessage(tx)).toMatchObject({
      type: '/bank.MsgSend',
      value: { from_address: sender, to_address: other, amount: '1500000ugnot' },
    });
    expect((tx as AdenaTransaction).signatures).toEqual([]);
  });

  it('builds a Transfer call on the token realm for a GRC20 token', async () => {
    const { sdk, lookups } = makeSdk();

    const { summary, tx } = await sdk.transfer(send('0.063607', 'gns'));

    expect(summary).toMatchObject({ token: 'GNS', amount: '0.063607' });
    expect(firstMessage(tx)).toMatchObject({
      type: '/vm.m_call',
      value: { caller: sender, pkg_path: gns.packagePath, func: 'Transfer', args: [other, '63607'], send: '' },
    });
    expect(lookups).toEqual([['gns', sender]]);
  });

  it('works in base units, so amounts beyond the safe integer range stay exact', async () => {
    const { tx } = await makeSdk().sdk.transfer(send('9007199254.740993'));

    expect(firstMessage(tx)).toMatchObject({ value: { amount: '9007199254740993ugnot' } });
  });

  it('lowercases the addresses it is given and names the configured chain', async () => {
    const { summary } = await makeSdk('test-chain').sdk.transfer({
      ...send('1'),
      from: ` ${sender.toUpperCase()} `,
      to: other.toUpperCase(),
    });

    expect(summary).toMatchObject({ chainId: 'test-chain', from: sender, to: other });
  });

  it.each([
    ['a zero amount', send('0'), WalletErrorCode.InvalidAmount],
    ['more decimals than the token has', send('0.0000001'), WalletErrorCode.InvalidAmount],
    ['an amount that is not a number', send('half'), WalletErrorCode.InvalidAmount],
    ['an amount above int64', send('9223372036854.775808'), WalletErrorCode.InvalidAmount],
    ['an unknown token', send('1', 'DOGE'), WalletErrorCode.UnknownToken],
    ['a malformed recipient', { ...send('1'), to: 'alice' }, WalletErrorCode.InvalidAddress],
    ['a malformed sender', { ...send('1'), from: 'bob' }, WalletErrorCode.InvalidAddress],
  ])('refuses %s', async (_label, params, code) => {
    await expect(makeSdk().sdk.transfer(params)).rejects.toMatchObject({ code });
  });

  it('accepts the largest int64 amount', async () => {
    await expect(makeSdk().sdk.transfer(send('9223372036854.775807'))).resolves.toMatchObject({
      summary: { amount: '9223372036854.775807' },
    });
  });
});

describe('approve', () => {
  it('builds an unsigned Approve call on the token realm', async () => {
    const { sdk } = makeSdk();

    const { summary, tx } = await sdk.approve({ from: sender, spender, amount: '10', token: 'GNS' });

    expect(summary).toEqual({
      type: TransactionType.Allowance,
      chainId: 'gnoland-1',
      from: sender,
      spender,
      amount: '10',
      token: 'GNS',
    });
    expect(firstMessage(tx)).toMatchObject({
      type: '/vm.m_call',
      value: { caller: sender, pkg_path: gns.packagePath, func: 'Approve', args: [spender, '10000000'] },
    });
    expect((tx as AdenaTransaction).signatures).toEqual([]);
  });

  it.each([
    ['the native token', { from: sender, spender, amount: '1', token: 'GNOT' }, WalletErrorCode.UnsupportedToken],
    ['a malformed spender', { from: sender, spender: 'alice', amount: '1', token: 'GNS' }, WalletErrorCode.InvalidAddress],
    ['a zero amount', { from: sender, spender, amount: '0', token: 'GNS' }, WalletErrorCode.InvalidAmount],
  ])('refuses an allowance with %s', async (_label, params, code) => {
    await expect(makeSdk().sdk.approve(params)).rejects.toMatchObject({ code });
  });
});

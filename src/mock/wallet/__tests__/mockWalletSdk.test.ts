import { TransactionType, WalletErrorCode } from '../../../agent';
import { INVALID_ADDRESS_LENGTH_MESSAGE, isValidAddress } from '../address';
import { FIXTURE } from '../fixture';
import { MockWalletSdk } from '../mockWalletSdk';
import { TokenSymbol } from '../tokens';

const [acc1] = FIXTURE.accounts;
const other = FIXTURE.contacts[0].address;
const to = FIXTURE.recipient;
const gnot = TokenSymbol.Gnot;
const gns = TokenSymbol.Gns;

const makeSdk = () => new MockWalletSdk();

const send = (amount: string, token: string = gnot) => ({
  from: acc1.address,
  to,
  amount,
  token,
});

const give = (amount: string, token: string = gns, spender = other) => ({
  from: acc1.address,
  spender,
  amount,
  token,
});

describe('fixtures and address check', () => {
  it('uses addresses that pass the wallet address check', () => {
    const all = [
      ...FIXTURE.accounts.map((a) => a.address),
      ...FIXTURE.contacts.map((c) => c.address),
      FIXTURE.recipient,
    ];
    expect(all.filter((address) => !isValidAddress(address))).toEqual([]);
  });

  it.each([
    '',
    'g1',
    acc1.address.slice(1), // wrong prefix
    acc1.address + 'q', // too long
    acc1.address.slice(0, -1), // too short
    'x1' + acc1.address.slice(2), // right length, wrong prefix
  ])('rejects %p', (address) => {
    expect(isValidAddress(address)).toBe(false);
  });

  it.each([
    'g1' + 'b'.repeat(38),
    'g1' + '1'.repeat(38),
    'g1' + 'A'.repeat(38),
  ])('accepts %p: only the prefix and the length are checked', async (address) => {
    expect(isValidAddress(address)).toBe(true);
    await expect(makeSdk().getBalance(address)).resolves.toEqual({ GNOT: '0', GNS: '0' });
  });
});

describe('getBalance', () => {
  it('returns every token as a canonical decimal', async () => {
    const sdk = makeSdk();

    expect(await sdk.getBalance(acc1.address)).toEqual({ GNOT: '10', GNS: '250' });
  });

  it('returns zeros for a valid address the wallet has never seen', async () => {
    expect(await makeSdk().getBalance(to)).toEqual({ GNOT: '0', GNS: '0' });
  });

  it('rejects a malformed address', async () => {
    await expect(makeSdk().getBalance('alice')).rejects.toMatchObject({
      code: WalletErrorCode.InvalidAddress,
    });
  });

  it.each([
    ['empty', ''],
    ['too short', acc1.address.slice(0, -1)],
    ['too long', acc1.address + 'q'],
  ])('tells the user the address length is invalid when it is %s', async (_label, address) => {
    await expect(makeSdk().getBalance(address)).rejects.toMatchObject({
      code: WalletErrorCode.InvalidAddress,
      message: INVALID_ADDRESS_LENGTH_MESSAGE,
    });
  });

  it('keeps the generic message for a right-length address in the wrong format', async () => {
    await expect(makeSdk().getBalance('x1' + acc1.address.slice(2))).rejects.toMatchObject({
      code: WalletErrorCode.InvalidAddress,
      message: 'Not a valid g1... address',
    });
  });
});

describe('transfer', () => {
  it('prepares a transfer with a normalized amount and moves no funds', async () => {
    const sdk = makeSdk();

    const { summary, tx } = await sdk.transfer(send('0.50'));

    expect(summary).toEqual({
      type: TransactionType.Transfer,
      chainId: 'gnoland-1',
      from: acc1.address,
      to,
      amount: '0.5',
      token: gnot,
    });
    expect(tx).toEqual(summary);
    expect(tx).not.toBe(summary);
    expect(await sdk.getBalance(acc1.address)).toEqual({ GNOT: '10', GNS: '250' });
    expect(await sdk.getBalance(to)).toEqual({ GNOT: '0', GNS: '0' });
  });

  it.each([
    ['sender is malformed', { ...send('1'), from: 'alice' }, WalletErrorCode.InvalidAddress],
    ['sender holds nothing', { ...send('1'), from: to }, WalletErrorCode.InsufficientBalance],
    ['recipient is malformed', { ...send('1'), to: 'alice' }, WalletErrorCode.InvalidAddress],
    ['amount is zero', send('0'), WalletErrorCode.InvalidAmount],
    ['amount is negative', send('-1'), WalletErrorCode.InvalidAmount],
    ['amount is not a number', send('half'), WalletErrorCode.InvalidAmount],
    ['amount is finer than 6 decimals', send('0.0000001'), WalletErrorCode.InvalidAmount],
    ['balance is too low', send('10.000001'), WalletErrorCode.InsufficientBalance],
    ['the token is unknown', send('1', 'DOGE'), WalletErrorCode.UnknownToken],
  ])('refuses when %s', async (_label, params, code) => {
    await expect(makeSdk().transfer(params)).rejects.toMatchObject({ code });
  });

  it('allows spending exactly the whole balance', async () => {
    const { summary } = await makeSdk().transfer(send('10'));

    expect(summary.amount).toBe('10');
  });

  it('finds a token by its symbol in any case and answers with the canonical symbol', async () => {
    const { summary } = await makeSdk().transfer(send('1', ' gnot '));

    expect(summary.token).toBe(gnot);
  });

  it('tells the user the recipient address length is invalid', async () => {
    await expect(makeSdk().transfer({ ...send('1'), to: to.slice(0, -1) })).rejects.toMatchObject({
      code: WalletErrorCode.InvalidAddress,
      message: INVALID_ADDRESS_LENGTH_MESSAGE,
    });
  });

  it('lowercases both addresses', async () => {
    const { summary } = await makeSdk().transfer({
      ...send('0.5'),
      from: acc1.address.toUpperCase(),
      to: to.toUpperCase(),
    });

    expect([summary.from, summary.to]).toEqual([acc1.address, to]);
  });

  it('leaves balances unchanged however often it is called', async () => {
    const sdk = makeSdk();

    await sdk.transfer(send('6'));
    await sdk.transfer(send('6'));

    expect(await sdk.getBalance(acc1.address)).toEqual({ GNOT: '10', GNS: '250' });
  });
});

describe('approve', () => {
  it('prepares an allowance and moves no funds', async () => {
    const sdk = makeSdk();

    const { summary, tx } = await sdk.approve(give('5.0', ' gns '));

    expect(summary).toEqual({
      type: TransactionType.Allowance,
      chainId: 'gnoland-1',
      from: acc1.address,
      spender: other,
      amount: '5',
      token: gns,
    });
    expect(tx).toEqual(summary);
    expect(await sdk.getBalance(acc1.address)).toEqual({ GNOT: '10', GNS: '250' });
  });

  it('allows an amount above the balance, like ERC-20', async () => {
    const { summary } = await makeSdk().approve(give('1000'));

    expect(summary.amount).toBe('1000');
  });

  it('lowercases the spender', async () => {
    const { summary } = await makeSdk().approve(give('5', gns, other.toUpperCase()));

    expect(summary.spender).toBe(other);
  });

  it.each([
    ['owner is malformed', { ...give('5'), from: 'alice' }, WalletErrorCode.InvalidAddress],
    ['spender is malformed', give('5', gns, 'x1' + to.slice(2)), WalletErrorCode.InvalidAddress],
    ['spender has the wrong length', give('5', gns, to.slice(0, -1)), WalletErrorCode.InvalidAddress],
    ['amount is zero', give('0'), WalletErrorCode.InvalidAmount],
    ['amount is negative', give('-1'), WalletErrorCode.InvalidAmount],
    ['amount is not a number', give('lots'), WalletErrorCode.InvalidAmount],
    ['the token is unknown', give('5', 'DOGE'), WalletErrorCode.UnknownToken],
  ])('refuses when %s', async (_label, params, code) => {
    await expect(makeSdk().approve(params)).rejects.toMatchObject({ code });
  });

  it('tells the user the spender address length is invalid', async () => {
    await expect(makeSdk().approve(give('5', gns, to.slice(0, -1)))).rejects.toMatchObject({
      message: INVALID_ADDRESS_LENGTH_MESSAGE,
    });
  });
});

describe('read-only wallet', () => {
  it('offers no signing and no allowance listing', () => {
    const sdk = makeSdk() as unknown as Record<string, unknown>;

    expect(sdk.sign).toBeUndefined();
    expect(sdk.getAllowances).toBeUndefined();
    expect(sdk.approvals).toBeUndefined();
  });

  it('reads balances in any address case', async () => {
    expect(await makeSdk().getBalance(acc1.address.toUpperCase())).toEqual({ GNOT: '10', GNS: '250' });
  });
});

describe('inspect', () => {
  it('shows only the funded accounts, before and after preparing', async () => {
    const sdk = makeSdk();
    const expected = { balances: { [acc1.address]: { GNOT: '10', GNS: '250' } } };

    expect(sdk.inspect()).toEqual(expected);
    await sdk.transfer(send('0.5'));
    await sdk.approve(give('5'));
    expect(sdk.inspect()).toEqual(expected);
  });
});

describe('owner-scoped holdings snapshots', () => {
  it('resolves each owner independently and retains each token precision', async () => {
    const a = 'gno.land/r/a/token';
    const b = 'gno.land/r/b/token';
    const sdk = new MockWalletSdk({
      accounts: [
        { ...acc1, holdings: [{ symbol: 'COIN', packagePath: a, amount: '2', decimals: 0 }] },
        { name: 'second', address: other, balances: { GNOT: '0', GNS: '0' },
          holdings: [{ symbol: 'COIN', packagePath: b, amount: '1.25', decimals: 2 }] },
      ],
    });
    const params = { from: acc1.address, to, token: 'COIN', amount: '2' };
    expect((await sdk.transfer(params)).summary).toMatchObject({ token: 'COIN', packagePath: a, amount: '2' });
    expect((await sdk.transfer({ ...params, from: other, amount: '1.25' })).summary)
      .toMatchObject({ token: 'COIN', packagePath: b, amount: '1.25' });
    await expect(sdk.transfer({ ...params, from: other, token: a }))
      .rejects.toMatchObject({ code: WalletErrorCode.UnknownToken });
    await expect(sdk.transfer({ ...params, amount: '1.1' }))
      .rejects.toMatchObject({ code: WalletErrorCode.InvalidAmount });
    await expect(sdk.transfer({ ...params, from: other, amount: '1.26' }))
      .rejects.toMatchObject({ code: WalletErrorCode.InsufficientBalance });
  });
});
